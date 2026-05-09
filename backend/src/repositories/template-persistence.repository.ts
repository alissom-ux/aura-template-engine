import type { Prisma } from "@prisma/client";
import { prisma } from "../db/prisma.client.js";

export interface PersistTemplateDraftInput {
  tenantId: string;
  title: string;
  sourcePrompt: string;
  templateStatus: string;
  versionStatus: string;
  campaignIntent: Prisma.InputJsonValue;
  communicationStrategy: Prisma.InputJsonValue;
  templateComponents: Prisma.InputJsonValue;
  variants: Prisma.InputJsonValue;
  approvalState: Prisma.InputJsonValue;
  policyReview?: {
    status: string;
    approved: boolean;
    confidence: number;
    risk: Prisma.InputJsonValue;
    categoryPrediction: Prisma.InputJsonValue;
    violations: Prisma.InputJsonValue;
    warnings: Prisma.InputJsonValue;
    suggestions: Prisma.InputJsonValue;
    rawPayload: Prisma.InputJsonValue;
  };
  auditReport?: {
    status: string;
    riskLevel: string;
    summary: string;
    blockingIssues: Prisma.InputJsonValue;
    warnings: Prisma.InputJsonValue;
    recommendedActions: Prisma.InputJsonValue;
    checklist: Prisma.InputJsonValue;
    submissionGate: Prisma.InputJsonValue;
    rawPayload: Prisma.InputJsonValue;
  };
  reviewSession?: {
    id?: string;
    status: string;
    snapshotHash?: string;
    snapshotVersion?: number;
    snapshotPayload?: Prisma.InputJsonValue;
    approvalState: Prisma.InputJsonValue;
  };
}

export interface PersistTemplateDraftResult {
  templateId: string;
  templateVersionId: string;
  versionNumber: number;
  reviewSessionId?: string;
}

export class TemplatePersistenceRepository {
  async createDraftVersion(input: PersistTemplateDraftInput): Promise<PersistTemplateDraftResult> {
    return prisma.$transaction(async (tx) => {
      const template = await tx.template.create({
        data: {
          tenantId: input.tenantId,
          title: input.title,
          sourcePrompt: input.sourcePrompt,
          status: input.templateStatus,
        },
      });

      const version = await tx.templateVersion.create({
        data: {
          tenantId: input.tenantId,
          templateId: template.id,
          versionNumber: 1,
          sourcePrompt: input.sourcePrompt,
          campaignIntent: input.campaignIntent,
          communicationStrategy: input.communicationStrategy,
          templateComponents: input.templateComponents,
          variants: input.variants,
          approvalState: input.approvalState,
          status: input.versionStatus,
        },
      });

      if (input.policyReview) {
        await tx.policyReview.create({
          data: {
            tenantId: input.tenantId,
            templateVersionId: version.id,
            ...input.policyReview,
          },
        });
      }

      if (input.auditReport) {
        await tx.auditReport.create({
          data: {
            tenantId: input.tenantId,
            templateVersionId: version.id,
            ...input.auditReport,
          },
        });
      }

      let reviewSessionId: string | undefined;
      if (input.reviewSession) {
        const reviewSession = await tx.reviewSession.create({
          data: {
            id: input.reviewSession.id,
            tenantId: input.tenantId,
            templateId: template.id,
            templateVersionId: version.id,
            status: input.reviewSession.status,
            snapshotHash: input.reviewSession.snapshotHash,
            snapshotVersion: input.reviewSession.snapshotVersion,
            snapshotPayload: input.reviewSession.snapshotPayload,
            approvalState: input.reviewSession.approvalState,
          },
        });
        reviewSessionId = reviewSession.id;
      }

      await tx.template.update({
        where: { id: template.id },
        data: {
          currentVersionId: version.id,
          status: resolveTemplateStatus(input.versionStatus),
        },
      });

      return {
        templateId: template.id,
        templateVersionId: version.id,
        versionNumber: version.versionNumber,
        reviewSessionId,
      };
    });
  }
}

function resolveTemplateStatus(versionStatus: string): string {
  if (versionStatus === "READY_FOR_REVIEW") return "IN_REVIEW";
  if (versionStatus === "BLOCKED" || versionStatus === "NEEDS_FIXES") return "NEEDS_FIXES";
  return "DRAFT";
}
