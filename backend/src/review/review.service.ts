import { randomUUID } from "node:crypto";
import {
  AgentType,
  ApprovalDecisionType,
  ApprovalGateEngine,
  DecisionConfidence,
  DecisionKind,
  ExecutionArtifactType,
  type ApprovalDecisionInput,
  type DecisionTraceEntry,
  type ExecutionArtifact,
  type HumanReviewer,
  type ReviewSession,
} from "../core/index.js";
import type {
  ReviewActionRequest,
  ReviewActionResult,
} from "./review.types.js";

const reviewSessions = new Map<string, ReviewSession>();
const reviewDecisionTrace = new Map<string, DecisionTraceEntry[]>();
const reviewArtifacts = new Map<string, ExecutionArtifact[]>();

export class ReviewService {
  private readonly approvalGateEngine = new ApprovalGateEngine();

  saveSession(session: ReviewSession): ReviewSession {
    reviewSessions.set(session.id, session);
    reviewDecisionTrace.set(session.id, reviewDecisionTrace.get(session.id) ?? []);
    reviewArtifacts.set(session.id, [
      ...(reviewArtifacts.get(session.id) ?? []),
      createArtifact("review_session.created", session),
      createArtifact("approval_gate.initial", session.approvalGate),
    ]);
    return session;
  }

  findSession(sessionId: string): ReviewSession | null {
    return reviewSessions.get(sessionId) ?? null;
  }

  getDecisionTrace(sessionId: string): DecisionTraceEntry[] {
    return getTrace(sessionId);
  }

  getArtifacts(sessionId: string): ExecutionArtifact[] {
    return getArtifacts(sessionId);
  }

  appendDecisionTrace(sessionId: string, entries: DecisionTraceEntry[]): DecisionTraceEntry[] {
    const next = [...getTrace(sessionId), ...entries];
    reviewDecisionTrace.set(sessionId, next);
    return next;
  }

  appendArtifacts(sessionId: string, artifacts: ExecutionArtifact[]): ExecutionArtifact[] {
    const next = [...getArtifacts(sessionId), ...artifacts];
    reviewArtifacts.set(sessionId, next);
    return next;
  }

  approve(sessionId: string, request: ReviewActionRequest): ReviewActionResult {
    return this.applyDecision(sessionId, request, ApprovalDecisionType.Approve);
  }

  reject(sessionId: string, request: ReviewActionRequest): ReviewActionResult {
    return this.applyDecision(sessionId, request, ApprovalDecisionType.Reject);
  }

  requestChanges(sessionId: string, request: ReviewActionRequest): ReviewActionResult {
    return this.applyDecision(sessionId, request, ApprovalDecisionType.RequestChanges);
  }

  private applyDecision(
    sessionId: string,
    request: ReviewActionRequest,
    decision: ApprovalDecisionType
  ): ReviewActionResult {
    const existing = this.findSession(sessionId);
    if (!existing) {
      return {
        success: false,
        error: {
          code: "review.session_not_found",
          message: "Review session not found.",
        },
      };
    }

    if (existing.currentSnapshot.hash !== request.snapshotHash) {
      return {
        success: false,
        error: {
          code: "review.snapshot_hash_mismatch",
          message: "Snapshot hash does not match the current review snapshot.",
          details: {
            expected: existing.currentSnapshot.hash,
            received: request.snapshotHash,
          },
        },
      };
    }

    if (existing.currentSnapshot.version !== request.snapshotVersion) {
      return {
        success: false,
        error: {
          code: "review.snapshot_version_mismatch",
          message: "Snapshot version does not match the current review snapshot.",
          details: {
            expected: existing.currentSnapshot.version,
            received: request.snapshotVersion,
          },
        },
      };
    }

    const input: ApprovalDecisionInput = {
      reviewSessionId: existing.id,
      snapshotId: existing.currentSnapshot.id,
      snapshotHash: request.snapshotHash,
      snapshotVersion: request.snapshotVersion,
      decision,
      reviewer: createReviewer(request.reviewer),
      comment: request.comment,
    };
    const updated = this.approvalGateEngine.applyDecision(existing, input);
    reviewSessions.set(updated.id, updated);

    const latestDecision = updated.decisions.at(-1);
    const trace = [
      ...getTrace(updated.id),
      createDecisionTrace(updated, decision),
      createGateTrace(updated),
    ];
    const artifacts = [
      ...getArtifacts(updated.id),
      createArtifact("review_session.updated", updated),
      createArtifact("approval_decision", latestDecision),
      createArtifact("approval_gate.updated", updated.approvalGate),
    ];

    reviewDecisionTrace.set(updated.id, trace);
    reviewArtifacts.set(updated.id, artifacts);

    return {
      success: true,
      reviewStatus: updated.status,
      gateStatus: updated.approvalGate.status,
      canCompile: updated.approvalGate.canCompile,
      approvalToken: updated.approvalGate.approvalToken,
      reviewEvents: updated.history.events,
      decisionTrace: trace,
      artifacts,
      reviewSession: updated,
      decision: latestDecision,
    };
  }
}

function createReviewer(name: string): HumanReviewer {
  return {
    id: normalizeReviewerId(name),
    name,
  };
}

function createDecisionTrace(
  session: ReviewSession,
  decision: ApprovalDecisionType
): DecisionTraceEntry {
  return {
    id: randomUUID(),
    executionId: session.executionId,
    agent: AgentType.Auditor,
    kind: DecisionKind.HumanReview,
    summary: `Human review decision applied: ${decision}.`,
    inputs: [
      { label: "reviewSessionId", value: session.id },
      { label: "snapshotHash", value: session.currentSnapshot.hash },
      { label: "snapshotVersion", value: session.currentSnapshot.version },
    ],
    output: { label: "reviewStatus", value: session.status },
    rationale: ["Decision was applied only after snapshot hash and version validation."],
    confidence: DecisionConfidence.High,
    createdAt: new Date().toISOString(),
  };
}

function createGateTrace(session: ReviewSession): DecisionTraceEntry {
  return {
    id: randomUUID(),
    executionId: session.executionId,
    agent: AgentType.Compiler,
    kind: DecisionKind.ApprovalGate,
    summary: "Approval gate updated after human review decision.",
    inputs: [{ label: "reviewStatus", value: session.status }],
    output: { label: "approvalGate", value: session.approvalGate },
    rationale: [session.approvalGate.reason],
    confidence: DecisionConfidence.High,
    createdAt: new Date().toISOString(),
  };
}

function createArtifact(label: string, value: unknown): ExecutionArtifact {
  return {
    id: randomUUID(),
    type: ExecutionArtifactType.AgentOutput,
    owner: "system",
    label,
    value,
    createdAt: new Date().toISOString(),
  };
}

function getTrace(sessionId: string): DecisionTraceEntry[] {
  return reviewDecisionTrace.get(sessionId) ?? [];
}

function getArtifacts(sessionId: string): ExecutionArtifact[] {
  return reviewArtifacts.get(sessionId) ?? [];
}

function normalizeReviewerId(name: string): string {
  const normalized = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return normalized.length > 0 ? normalized : "reviewer";
}
