import { createHash, randomUUID } from "node:crypto";
import {
  AgentType,
  ApprovalGateStatus,
  DecisionConfidence,
  DecisionKind,
  ExecutionArtifactType,
  ReviewSessionStatus,
  type DecisionTraceEntry,
  type ExecutionArtifact,
} from "../core/index.js";
import { ReviewService } from "../review/index.js";
import type {
  MetaCompiledTemplate,
  MetaCompilerRequest,
  MetaTemplatePayload,
} from "./meta-compiler.types.js";
import { MetaPayloadValidator } from "./meta-payload.validator.js";
import { MetaTemplateCompiler } from "./meta-template.compiler.js";

export class MetaCompilerService {
  private readonly reviewService = new ReviewService();
  private readonly templateCompiler = new MetaTemplateCompiler();
  private readonly validator = new MetaPayloadValidator();

  compile(request: MetaCompilerRequest): MetaCompiledTemplate {
    const session = this.reviewService.findSession(request.reviewSessionId);
    if (!session) {
      return failed("compiler.review_session_not_found", "Review session not found.", request.reviewSessionId);
    }

    if (session.status !== ReviewSessionStatus.Approved) {
      return failed("compiler.snapshot_not_approved", "Review session is not approved.", session.status);
    }

    if (session.approvalGate.status !== ApprovalGateStatus.Open || !session.approvalGate.canCompile) {
      return failed("compiler.approval_gate_closed", "Approval gate is not open for compiler handoff.", session.approvalGate);
    }

    if (!session.approvalGate.approvalToken || session.approvalGate.approvalToken !== request.approvalToken) {
      return failed("compiler.approval_token_invalid", "Approval token is missing or invalid.");
    }

    const metaPayload = this.templateCompiler.compile(session.currentSnapshot);
    const validation = this.validator.validate(metaPayload);
    const compileChecksum = createCompileChecksum(metaPayload, session.currentSnapshot.hash, request.approvalToken);
    const trace = [
      createCompileTrace(session.executionId, metaPayload, validation.valid),
      createChecksumTrace(session.executionId, compileChecksum),
    ];
    const artifacts = [
      createArtifact("meta_payload.draft", metaPayload),
      createArtifact("meta_payload.validation", validation),
      createArtifact("meta_payload.compile_checksum", compileChecksum),
    ];

    const decisionTrace = this.reviewService.appendDecisionTrace(session.id, trace);
    const allArtifacts = this.reviewService.appendArtifacts(session.id, artifacts);

    return {
      success: validation.valid,
      compiled: validation.valid,
      compileChecksum,
      metaPayload,
      validation,
      decisionTrace,
      artifacts: allArtifacts,
      error: validation.valid
        ? undefined
        : {
            code: "compiler.meta_payload_invalid",
            message: "Compiled Meta payload failed validation.",
            details: validation.errors,
          },
    };
  }
}

function createCompileChecksum(
  payload: MetaTemplatePayload,
  snapshotHash: string,
  approvalToken: string
): string {
  return sha256(stableStringify({ payload, snapshotHash, approvalToken }));
}

function createCompileTrace(
  executionId: string,
  payload: MetaTemplatePayload,
  valid: boolean
): DecisionTraceEntry {
  return {
    id: randomUUID(),
    executionId,
    agent: AgentType.Compiler,
    kind: DecisionKind.SemanticMapping,
    summary: "Compiled approved template components into a local Meta payload draft.",
    inputs: [{ label: "templateComponents", value: payload.components }],
    output: { label: "metaPayload", value: payload },
    rationale: ["Compiler boundary only runs after approval gate validation."],
    confidence: valid ? DecisionConfidence.High : DecisionConfidence.Medium,
    createdAt: new Date().toISOString(),
  };
}

function createChecksumTrace(executionId: string, checksum: string): DecisionTraceEntry {
  return {
    id: randomUUID(),
    executionId,
    agent: AgentType.Compiler,
    kind: DecisionKind.OutputValidation,
    summary: "Generated deterministic compile checksum.",
    inputs: [],
    output: { label: "compileChecksum", value: checksum },
    rationale: ["Checksum binds payload, approved snapshot, and approval token."],
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

function failed(code: string, message: string, details?: unknown): MetaCompiledTemplate {
  return {
    success: false,
    compiled: false,
    validation: { valid: false, warnings: [], errors: [{ code, message }] },
    decisionTrace: [],
    artifacts: [],
    error: { code, message, details },
  };
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function stableStringify(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, sortValue(item)])
    );
  }
  return value;
}
