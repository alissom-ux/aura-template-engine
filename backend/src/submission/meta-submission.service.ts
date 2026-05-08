import { randomUUID } from "node:crypto";
import {
  AgentType,
  ApprovalGateStatus,
  DecisionConfidence,
  DecisionKind,
  ExecutionArtifactType,
  ReviewSessionStatus,
  type DecisionTraceEntry,
  type ExecutionArtifact,
  type ReviewSession,
} from "../core/index.js";
import type {
  MetaCompiledTemplate,
  MetaTemplatePayload,
} from "../compiler/index.js";
import { ReviewService } from "../review/index.js";
import { MetaApiClient } from "./meta-api.client.js";
import {
  type MetaApiClientConfig,
  type MetaSubmissionError,
  type MetaSubmissionRequest,
  type MetaSubmissionResult,
} from "./meta-submission.types.js";
import { MetaSubmissionState } from "./submission-state.model.js";

export class MetaSubmissionService {
  private readonly reviewService = new ReviewService();
  private readonly metaApiClient = new MetaApiClient();

  async submit(request: MetaSubmissionRequest): Promise<MetaSubmissionResult> {
    const dryRun = request.dryRun ?? true;
    const session = this.reviewService.findSession(request.reviewSessionId);

    if (!session) {
      return failed(MetaSubmissionState.Failed, dryRun, "submission.review_session_not_found", "Review session not found.");
    }

    const preflightErrors = this.validatePreflight(session, request);
    if (preflightErrors.length > 0) {
      return {
        success: false,
        state: MetaSubmissionState.Failed,
        dryRun,
        validation: { valid: false, errors: preflightErrors },
        decisionTrace: this.reviewService.getDecisionTrace(session.id),
        artifacts: this.reviewService.getArtifacts(session.id),
        error: preflightErrors[0],
      };
    }

    const compiled = findCompiledTemplate(this.reviewService.getArtifacts(session.id), request.compileChecksum);
    if (!compiled?.metaPayload) {
      return failedWithSession(
        this.reviewService,
        session,
        dryRun,
        "submission.compiled_template_missing",
        "Compiled template artifact was not found for the provided checksum."
      );
    }

    if (dryRun) {
      const result = this.recordSubmissionResult(
        session,
        MetaSubmissionState.DryRunReady,
        true,
        request.compileChecksum,
        compiled.metaPayload,
        undefined
      );

      return {
        success: true,
        state: MetaSubmissionState.DryRunReady,
        dryRun: true,
        metaPayload: compiled.metaPayload,
        validation: { valid: true, errors: [] },
        decisionTrace: result.decisionTrace,
        artifacts: result.artifacts,
      };
    }

    const envResult = readMetaEnv();
    if (!envResult.success) {
      return failedWithSession(
        this.reviewService,
        session,
        false,
        envResult.error.code,
        envResult.error.message
      );
    }

    const apiResult = await this.metaApiClient.submitTemplate(compiled.metaPayload, envResult.config);
    if (!apiResult.success) {
      return failedWithSession(
        this.reviewService,
        session,
        false,
        apiResult.error?.code ?? "meta_api.error",
        apiResult.error?.message ?? "Meta API returned an error.",
        apiResult.error?.details
      );
    }

    const recorded = this.recordSubmissionResult(
      session,
      MetaSubmissionState.MetaPending,
      false,
      request.compileChecksum,
      compiled.metaPayload,
      apiResult.response
    );

    return {
      success: true,
      state: MetaSubmissionState.MetaPending,
      dryRun: false,
      metaPayload: compiled.metaPayload,
      metaResponse: {
        id: apiResult.response?.id,
        status: apiResult.response?.status ?? "PENDING",
        category: apiResult.response?.category ?? compiled.metaPayload.category,
        ...apiResult.response,
      },
      validation: { valid: true, errors: [] },
      decisionTrace: recorded.decisionTrace,
      artifacts: recorded.artifacts,
    };
  }

  private validatePreflight(
    session: ReviewSession,
    request: MetaSubmissionRequest
  ): MetaSubmissionError[] {
    const errors: MetaSubmissionError[] = [];

    if (session.status !== ReviewSessionStatus.Approved) {
      errors.push({
        code: "submission.review_not_approved",
        message: "Review session must be APPROVED before submission.",
        details: session.status,
      });
    }
    if (session.approvalGate.status !== ApprovalGateStatus.Open) {
      errors.push({
        code: "submission.approval_gate_not_open",
        message: "Approval gate must be OPEN before submission.",
        details: session.approvalGate.status,
      });
    }
    if (!session.approvalGate.approvalToken || session.approvalGate.approvalToken !== request.approvalToken) {
      errors.push({
        code: "submission.approval_token_invalid",
        message: "Approval token is missing or invalid.",
      });
    }

    return errors;
  }

  private recordSubmissionResult(
    session: ReviewSession,
    state: MetaSubmissionState,
    dryRun: boolean,
    compileChecksum: string,
    metaPayload: MetaTemplatePayload,
    metaResponse: unknown
  ): { decisionTrace: DecisionTraceEntry[]; artifacts: ExecutionArtifact[] } {
    const artifact = createArtifact("meta_submission", {
      id: randomUUID(),
      reviewSessionId: session.id,
      compileChecksum,
      state,
      dryRun,
      metaPayload,
      metaResponse,
      createdAt: new Date().toISOString(),
    });
    const trace = createSubmissionTrace(session, state, dryRun, compileChecksum);

    return {
      decisionTrace: this.reviewService.appendDecisionTrace(session.id, [trace]),
      artifacts: this.reviewService.appendArtifacts(session.id, [artifact]),
    };
  }
}

function findCompiledTemplate(
  artifacts: ExecutionArtifact[],
  checksum: string
): { metaPayload?: MetaTemplatePayload } | null {
  const checksumArtifact = artifacts.find(
    (artifact) => artifact.label === "meta_payload.compile_checksum" && artifact.value === checksum
  );
  if (!checksumArtifact) return null;

  const payloadArtifact = [...artifacts]
    .reverse()
    .find((artifact) => artifact.label === "meta_payload.draft");

  return payloadArtifact ? { metaPayload: payloadArtifact.value as MetaTemplatePayload } : null;
}

function readMetaEnv():
  | { success: true; config: MetaApiClientConfig }
  | { success: false; error: MetaSubmissionError } {
  const graphVersion = process.env.META_GRAPH_VERSION ?? "v25.0";
  const wabaId = process.env.META_WABA_ID ?? "1279889660506399";
  const accessToken = process.env.META_ACCESS_TOKEN;

  if (!wabaId) {
    return {
      success: false,
      error: {
        code: "submission.env.missing_waba_id",
        message: "META_WABA_ID is required when dryRun is false.",
      },
    };
  }
  if (!accessToken) {
    return {
      success: false,
      error: {
        code: "submission.env.missing_access_token",
        message: "META_ACCESS_TOKEN is required when dryRun is false.",
      },
    };
  }

  return {
    success: true,
    config: { graphVersion, wabaId, accessToken },
  };
}

function createSubmissionTrace(
  session: ReviewSession,
  state: MetaSubmissionState,
  dryRun: boolean,
  compileChecksum: string
): DecisionTraceEntry {
  return {
    id: randomUUID(),
    executionId: session.executionId,
    agent: AgentType.Compiler,
    kind: DecisionKind.ApprovalGate,
    summary: dryRun
      ? "Dry-run Meta submission validated without calling Meta."
      : "Meta submission request executed.",
    inputs: [
      { label: "reviewSessionId", value: session.id },
      { label: "compileChecksum", value: compileChecksum },
      { label: "dryRun", value: dryRun },
    ],
    output: { label: "submissionState", value: state },
    rationale: ["Submission boundary requires approval token and compiled payload checksum."],
    confidence: DecisionConfidence.High,
    createdAt: new Date().toISOString(),
  };
}

function createArtifact(label: string, value: unknown): ExecutionArtifact {
  return {
    id: randomUUID(),
    type: ExecutionArtifactType.AgentOutput,
    owner: AgentType.Compiler,
    label,
    value,
    createdAt: new Date().toISOString(),
  };
}

function failed(
  state: MetaSubmissionState,
  dryRun: boolean,
  code: string,
  message: string,
  details?: unknown
): MetaSubmissionResult {
  return {
    success: false,
    state,
    dryRun,
    validation: { valid: false, errors: [{ code, message, details }] },
    decisionTrace: [],
    artifacts: [],
    error: { code, message, details },
  };
}

function failedWithSession(
  reviewService: ReviewService,
  session: ReviewSession,
  dryRun: boolean,
  code: string,
  message: string,
  details?: unknown
): MetaSubmissionResult {
  return {
    success: false,
    state: MetaSubmissionState.Failed,
    dryRun,
    validation: { valid: false, errors: [{ code, message, details }] },
    decisionTrace: reviewService.getDecisionTrace(session.id),
    artifacts: reviewService.getArtifacts(session.id),
    error: { code, message, details },
  };
}
