import type { Prisma } from "@prisma/client";
import { prisma } from "../db/prisma.client.js";

export interface PersistedReviewSessionRecord {
  id: string;
  tenantId: string;
  templateId: string;
  templateVersionId: string;
  executionId: string | null;
  status: string;
  reviewer: Prisma.JsonValue | null;
  comment: string | null;
  snapshotHash: string | null;
  snapshotVersion: number | null;
  snapshotPayload: Prisma.JsonValue | null;
  approvalState: Prisma.JsonValue;
  decisionsPayload: Prisma.JsonValue;
  historyPayload: Prisma.JsonValue;
  decisionTrace: Prisma.JsonValue;
  artifacts: Prisma.JsonValue;
  reviewResult: Prisma.JsonValue | null;
  approvalToken: string | null;
  decidedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PersistReviewDecisionInput {
  tenantId: string;
  sessionId: string;
  status: string;
  reviewer?: Prisma.InputJsonValue;
  comment?: string;
  approvalState: Prisma.InputJsonValue;
  decisionsPayload: Prisma.InputJsonValue;
  historyPayload: Prisma.InputJsonValue;
  decisionTrace: Prisma.InputJsonValue;
  artifacts: Prisma.InputJsonValue;
  reviewResult: Prisma.InputJsonValue;
  approvalToken?: string;
  latestDecision?: {
    id: string;
    templateId: string;
    templateVersionId: string;
    snapshotId: string;
    decision: string;
    reviewer: Prisma.InputJsonValue;
    comment?: string;
    approvalToken?: string;
    rawPayload: Prisma.InputJsonValue;
    createdAt: Date;
  };
  historyEvents: Array<{
    id: string;
    templateId: string;
    templateVersionId: string;
    type: string;
    message: string;
    metadata?: Prisma.InputJsonValue;
    rawPayload: Prisma.InputJsonValue;
    createdAt: Date;
  }>;
}

export class ReviewSessionRepository {
  async findById(tenantId: string, sessionId: string): Promise<PersistedReviewSessionRecord | null> {
    return prisma.reviewSession.findFirst({
      where: {
        id: sessionId,
        tenantId,
      },
    });
  }

  async assertAccessible(tenantId: string): Promise<void> {
    await prisma.reviewSession.findFirst({
      where: { tenantId },
      select: { id: true },
    });
  }

  async persistDecision(input: PersistReviewDecisionInput): Promise<PersistedReviewSessionRecord> {
    return prisma.$transaction(async (tx) => {
      const updated = await tx.reviewSession.update({
        where: { id: input.sessionId },
        data: {
          status: input.status,
          reviewer: input.reviewer,
          comment: input.comment,
          approvalState: input.approvalState,
          decisionsPayload: input.decisionsPayload,
          historyPayload: input.historyPayload,
          decisionTrace: input.decisionTrace,
          artifacts: input.artifacts,
          reviewResult: input.reviewResult,
          approvalToken: input.approvalToken,
          decidedAt: new Date(),
        },
      });

      if (input.latestDecision) {
        await tx.reviewApprovalDecision.upsert({
          where: { id: input.latestDecision.id },
          create: {
            id: input.latestDecision.id,
            tenantId: input.tenantId,
            reviewSessionId: input.sessionId,
            templateId: input.latestDecision.templateId,
            templateVersionId: input.latestDecision.templateVersionId,
            snapshotId: input.latestDecision.snapshotId,
            decision: input.latestDecision.decision,
            reviewer: input.latestDecision.reviewer,
            comment: input.latestDecision.comment,
            approvalToken: input.latestDecision.approvalToken,
            rawPayload: input.latestDecision.rawPayload,
            createdAt: input.latestDecision.createdAt,
          },
          update: {
            decision: input.latestDecision.decision,
            reviewer: input.latestDecision.reviewer,
            comment: input.latestDecision.comment,
            approvalToken: input.latestDecision.approvalToken,
            rawPayload: input.latestDecision.rawPayload,
          },
        });
      }

      for (const event of input.historyEvents) {
        await tx.reviewHistoryEvent.upsert({
          where: { id: event.id },
          create: {
            id: event.id,
            tenantId: input.tenantId,
            reviewSessionId: input.sessionId,
            templateId: event.templateId,
            templateVersionId: event.templateVersionId,
            type: event.type,
            message: event.message,
            metadata: event.metadata,
            rawPayload: event.rawPayload,
            createdAt: event.createdAt,
          },
          update: {
            type: event.type,
            message: event.message,
            metadata: event.metadata,
            rawPayload: event.rawPayload,
          },
        });
      }

      return updated;
    });
  }
}
