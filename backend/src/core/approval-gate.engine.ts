import { createHash, randomUUID } from "node:crypto";
import {
  ApprovalDecisionType,
  ApprovalGateStatus,
  type ApprovalDecision,
  type ApprovalDecisionInput,
  type ApprovalGate,
} from "./approval-decision.model.js";
import { AuditReportStatus, type AuditReport } from "./audit-report.model.js";
import {
  ReviewHistoryEventType,
  type ReviewHistoryEvent,
} from "./review-history.model.js";
import {
  type ReviewSnapshot,
  type ReviewSnapshotInput,
} from "./review-snapshot.model.js";
import {
  ReviewSessionStatus,
  type ReviewSession,
  type ReviewSessionInput,
} from "./review-session.model.js";

export class ApprovalGateEngine {
  createSnapshot(input: ReviewSnapshotInput): ReviewSnapshot {
    const createdAt = new Date().toISOString();
    const hashPayload = stableStringify({
      version: input.version,
      campaignIntent: input.campaignIntent,
      communicationStrategy: input.communicationStrategy,
      semanticTemplate: input.semanticTemplate,
      messageStructure: input.messageStructure,
      copyBlocks: input.copyBlocks,
      templateComponents: input.templateComponents,
      validation: input.validation,
      policyReview: input.policyReview,
      auditReport: input.auditReport,
    });

    return {
      ...input,
      id: randomUUID(),
      hash: sha256(hashPayload),
      immutable: true,
      createdAt,
    };
  }

  createReviewSession(input: ReviewSessionInput): ReviewSession {
    const now = new Date().toISOString();
    const gate = this.evaluateGate(input.snapshot.auditReport);
    const sessionId = input.snapshot.reviewSessionId;

    return {
      id: sessionId,
      executionId: input.executionId,
      status: ReviewSessionStatus.PendingReview,
      currentSnapshot: input.snapshot,
      version: input.snapshot.version,
      approvalGate: gate,
      decisions: [],
      history: {
        reviewSessionId: sessionId,
        events: [
          createHistoryEvent(sessionId, ReviewHistoryEventType.SessionCreated, "Human review session created."),
          createHistoryEvent(sessionId, ReviewHistoryEventType.SnapshotCreated, "Immutable review snapshot created.", {
            snapshotId: input.snapshot.id,
            snapshotHash: input.snapshot.hash,
            version: input.snapshot.version,
          }),
          createHistoryEvent(sessionId, ReviewHistoryEventType.GateEvaluated, gate.reason, { gate }),
        ],
      },
      createdAt: now,
      updatedAt: now,
    };
  }

  applyDecision(session: ReviewSession, input: ApprovalDecisionInput): ReviewSession {
    if (input.snapshotHash !== session.currentSnapshot.hash) {
      throw new Error("Approval decision snapshot hash does not match current review snapshot.");
    }
    if (input.snapshotVersion !== session.currentSnapshot.version) {
      throw new Error("Approval decision snapshot version does not match current review snapshot.");
    }

    const now = new Date().toISOString();
    const approvalToken = input.decision === ApprovalDecisionType.Approve
      ? createApprovalToken(input)
      : undefined;
    const decision: ApprovalDecision = {
      id: randomUUID(),
      reviewSessionId: session.id,
      snapshotId: input.snapshotId,
      decision: input.decision,
      reviewer: input.reviewer,
      comment: input.comment,
      approvalToken,
      createdAt: now,
    };
    const approvalGate = this.resolveGateFromDecision(session.currentSnapshot.auditReport, decision);
    const status = resolveSessionStatus(input.decision);

    return {
      ...session,
      status,
      approvalGate,
      decisions: [...session.decisions, decision],
      history: {
        reviewSessionId: session.id,
        events: [
          ...session.history.events,
          createHistoryEvent(session.id, eventTypeForDecision(input.decision), `Human reviewer selected ${input.decision}.`, { decision }),
          createHistoryEvent(session.id, ReviewHistoryEventType.GateEvaluated, approvalGate.reason, { gate: approvalGate }),
        ],
      },
      updatedAt: now,
    };
  }

  evaluateGate(auditReport: AuditReport): ApprovalGate {
    if (auditReport.status !== AuditReportStatus.ReadyForReview) {
      return {
        status: ApprovalGateStatus.Locked,
        canCompile: false,
        canSubmit: false,
        reason: "Approval gate locked until audit status is READY_FOR_REVIEW.",
        requiresExplicitApproval: true,
      };
    }

    return {
      status: ApprovalGateStatus.Locked,
      canCompile: false,
      canSubmit: false,
      reason: "Awaiting explicit human approval for the frozen audit snapshot.",
      requiresExplicitApproval: true,
    };
  }

  private resolveGateFromDecision(
    auditReport: AuditReport,
    decision: ApprovalDecision
  ): ApprovalGate {
    if (decision.decision === ApprovalDecisionType.Approve && auditReport.status === AuditReportStatus.ReadyForReview) {
      return {
        status: ApprovalGateStatus.Open,
        canCompile: true,
        canSubmit: false,
        approvalToken: decision.approvalToken,
        reason: "Human approval token is valid for compiler handoff. Submission remains disabled until Meta integration exists.",
        requiresExplicitApproval: true,
        approvedBy: decision.reviewer,
        approvedAt: decision.createdAt,
      };
    }

    if (decision.decision === ApprovalDecisionType.Reject) {
      return {
        status: ApprovalGateStatus.Rejected,
        canCompile: false,
        canSubmit: false,
        reason: "Human reviewer rejected the snapshot.",
        requiresExplicitApproval: true,
      };
    }

    return {
      status: ApprovalGateStatus.ChangesRequested,
      canCompile: false,
      canSubmit: false,
      reason: "Human reviewer requested changes before compiler handoff.",
      requiresExplicitApproval: true,
    };
  }
}

function createApprovalToken(input: ApprovalDecisionInput): string {
  return sha256(stableStringify({
    reviewSessionId: input.reviewSessionId,
    snapshotId: input.snapshotId,
    snapshotHash: input.snapshotHash,
    snapshotVersion: input.snapshotVersion,
    reviewerId: input.reviewer.id,
    decision: input.decision,
  }));
}

function createHistoryEvent(
  reviewSessionId: string,
  type: ReviewHistoryEventType,
  message: string,
  metadata?: Record<string, unknown>
): ReviewHistoryEvent {
  return {
    id: randomUUID(),
    reviewSessionId,
    type,
    message,
    metadata,
    createdAt: new Date().toISOString(),
  };
}

function resolveSessionStatus(decision: ApprovalDecisionType): ReviewSessionStatus {
  if (decision === ApprovalDecisionType.Approve) return ReviewSessionStatus.Approved;
  if (decision === ApprovalDecisionType.Reject) return ReviewSessionStatus.Rejected;
  return ReviewSessionStatus.ChangesRequested;
}

function eventTypeForDecision(decision: ApprovalDecisionType): ReviewHistoryEventType {
  if (decision === ApprovalDecisionType.Approve) return ReviewHistoryEventType.Approved;
  if (decision === ApprovalDecisionType.Reject) return ReviewHistoryEventType.Rejected;
  return ReviewHistoryEventType.ChangesRequested;
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
