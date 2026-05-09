import type { Prisma } from "@prisma/client";
import { DEFAULT_TENANT_ID } from "../config/env.js";
import type {
  ApprovalDecision,
  DecisionTraceEntry,
  ExecutionArtifact,
  ReviewHistory,
  ReviewHistoryEvent,
  ReviewSession,
  ReviewSnapshot,
} from "../core/index.js";
import {
  ReviewSessionRepository,
  type PersistedReviewSessionRecord,
} from "../repositories/review-session.repository.js";
import type { ReviewActionResult } from "../review/review.types.js";

export interface HydratedReviewSession {
  session: ReviewSession;
  decisionTrace: DecisionTraceEntry[];
  artifacts: ExecutionArtifact[];
  tenantId: string;
  templateId: string;
  templateVersionId: string;
}

export class ReviewSessionPersistenceService {
  private readonly repository = new ReviewSessionRepository();

  async hydrate(sessionId: string, tenantId = DEFAULT_TENANT_ID): Promise<HydratedReviewSession | null> {
    console.info({ sessionId, tenantId }, "review hydration started");
    const record = await this.repository.findById(tenantId, sessionId);
    if (!record) {
      console.warn({ sessionId, tenantId }, "review hydration missed persistent store");
      return null;
    }

    const snapshot = record.snapshotPayload as unknown as ReviewSnapshot | null;
    if (!snapshot) {
      console.warn({ sessionId, tenantId }, "review hydration found record without snapshot payload");
      return null;
    }

    const decisions = asArray<ApprovalDecision>(record.decisionsPayload);
    const history = normalizeHistory(sessionId, record.historyPayload);
    const session: ReviewSession = {
      id: record.id,
      executionId: record.executionId ?? snapshot.id,
      status: record.status as ReviewSession["status"],
      currentSnapshot: snapshot,
      version: record.snapshotVersion ?? snapshot.version,
      approvalGate: record.approvalState as unknown as ReviewSession["approvalGate"],
      decisions,
      history,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };

    console.info({ sessionId, tenantId, status: session.status }, "review hydration completed");
    return {
      session,
      decisionTrace: asArray<DecisionTraceEntry>(record.decisionTrace),
      artifacts: asArray<ExecutionArtifact>(record.artifacts),
      tenantId,
      templateId: record.templateId,
      templateVersionId: record.templateVersionId,
    };
  }

  async persistReviewResult(
    hydrated: HydratedReviewSession,
    result: ReviewActionResult
  ): Promise<void> {
    if (!result.success || !result.reviewSession) return;

    const latestDecision = result.decision;
    const session = result.reviewSession;

    console.info(
      {
        sessionId: session.id,
        tenantId: hydrated.tenantId,
        status: session.status,
        decision: latestDecision?.decision,
      },
      "review persistence started"
    );

    await this.repository.persistDecision({
      tenantId: hydrated.tenantId,
      sessionId: session.id,
      status: session.status,
      reviewer: latestDecision ? toJson(latestDecision.reviewer) : undefined,
      comment: latestDecision?.comment,
      approvalState: toJson(session.approvalGate),
      decisionsPayload: toJson(session.decisions),
      historyPayload: toJson(session.history),
      decisionTrace: toJson(result.decisionTrace ?? []),
      artifacts: toJson(result.artifacts ?? []),
      reviewResult: toJson(result),
      approvalToken: result.approvalToken,
      latestDecision: latestDecision
        ? {
            id: latestDecision.id,
            templateId: hydrated.templateId,
            templateVersionId: hydrated.templateVersionId,
            snapshotId: latestDecision.snapshotId,
            decision: latestDecision.decision,
            reviewer: toJson(latestDecision.reviewer),
            comment: latestDecision.comment,
            approvalToken: latestDecision.approvalToken,
            rawPayload: toJson(latestDecision),
            createdAt: new Date(latestDecision.createdAt),
          }
        : undefined,
      historyEvents: session.history.events.map((event) => ({
        id: event.id,
        templateId: hydrated.templateId,
        templateVersionId: hydrated.templateVersionId,
        type: normalizeEventType(event.type),
        message: event.message,
        metadata: event.metadata ? toJson(event.metadata) : undefined,
        rawPayload: toJson(event),
        createdAt: new Date(event.createdAt),
      })),
    });

    console.info(
      { sessionId: session.id, tenantId: hydrated.tenantId, status: session.status },
      "review persistence completed"
    );
  }

  async checkRepositoryAccess(tenantId = DEFAULT_TENANT_ID): Promise<void> {
    await this.repository.assertAccessible(tenantId);
  }
}

function normalizeHistory(sessionId: string, value: unknown): ReviewHistory {
  const history = value as Partial<ReviewHistory> | null;
  return {
    reviewSessionId: history?.reviewSessionId ?? sessionId,
    events: Array.isArray(history?.events) ? history.events as ReviewHistoryEvent[] : [],
  };
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function normalizeEventType(value: string): string {
  return value.toLowerCase();
}
