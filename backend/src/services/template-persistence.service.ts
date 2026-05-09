import type { Prisma } from "@prisma/client";
import { DEFAULT_TENANT_ID } from "../config/env.js";
import type { TemplateDraftPipelineRequest, TemplateDraftPipelineResult } from "../pipeline/index.js";
import { TemplatePersistenceRepository } from "../repositories/template-persistence.repository.js";

export class TemplatePersistenceService {
  private readonly repository = new TemplatePersistenceRepository();

  async persistDraft(
    request: TemplateDraftPipelineRequest,
    result: TemplateDraftPipelineResult
  ): Promise<{ templateId: string; templateVersionId: string; versionNumber: number; reviewSessionId?: string }> {
    const auditStatus = result.auditReport?.status ?? (result.success ? "READY_FOR_REVIEW" : "NEEDS_FIXES");

    return this.repository.createDraftVersion({
      tenantId: DEFAULT_TENANT_ID,
      title: createTemplateTitle(request.userPrompt),
      sourcePrompt: request.userPrompt,
      templateStatus: result.success ? "IN_REVIEW" : "NEEDS_FIXES",
      versionStatus: auditStatus,
      campaignIntent: toJson(result.campaignIntent ?? {}),
      communicationStrategy: toJson(result.communicationStrategy ?? {}),
      templateComponents: toJson(result.templateComponents ?? []),
      variants: toJson(buildDerivedVariants(result)),
      approvalState: toJson(result.humanReview ?? { required: true, status: "PENDING_REVIEW" }),
      policyReview: result.policyReview
        ? {
            status: result.policyReview.status,
            approved: result.policyReview.approved,
            confidence: result.policyReview.confidence,
            risk: toJson(result.policyReview.risk),
            categoryPrediction: toJson(result.policyReview.categoryPrediction),
            violations: toJson(result.policyReview.violations),
            warnings: toJson(result.policyReview.warnings),
            suggestions: toJson(result.policyReview.suggestions),
            rawPayload: toJson(result.policyReview),
          }
        : undefined,
      auditReport: result.auditReport
        ? {
            status: result.auditReport.status,
            riskLevel: result.auditReport.riskLevel,
            summary: result.auditReport.summary,
            blockingIssues: toJson(result.auditReport.blockingIssues),
            warnings: toJson(result.auditReport.warnings),
            recommendedActions: toJson(result.auditReport.recommendedActions),
            checklist: toJson(result.auditReport.checklist),
            submissionGate: toJson(result.auditReport.submissionGate),
            rawPayload: toJson(result.auditReport),
          }
        : undefined,
      reviewSession: result.reviewSession
        ? {
            id: result.reviewSession.id,
            executionId: result.reviewSession.executionId,
            status: result.reviewSession.status,
            snapshotHash: result.reviewSession.currentSnapshot.hash,
            snapshotVersion: result.reviewSession.currentSnapshot.version,
            snapshotPayload: toJson(result.reviewSnapshot ?? result.reviewSession.currentSnapshot),
            approvalState: toJson(result.reviewSession.approvalGate),
            decisionsPayload: toJson(result.reviewSession.decisions),
            historyPayload: toJson(result.reviewSession.history),
            decisionTrace: toJson(result.decisionTrace ?? []),
            artifacts: toJson([
              {
                label: "review_session.created",
                value: result.reviewSession,
                createdAt: new Date().toISOString(),
              },
            ]),
            historyEvents: result.reviewSession.history.events.map((event) => ({
              id: event.id,
              type: event.type.toLowerCase(),
              message: event.message,
              metadata: event.metadata ? toJson(event.metadata) : undefined,
              rawPayload: toJson(event),
              createdAt: new Date(event.createdAt),
            })),
          }
        : undefined,
    });
  }
}

function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function createTemplateTitle(prompt: string): string {
  const trimmed = prompt.trim().replace(/\s+/g, " ");
  if (trimmed.length <= 80) return trimmed;
  return `${trimmed.slice(0, 77)}...`;
}

function buildDerivedVariants(result: TemplateDraftPipelineResult) {
  const body = result.templateComponents?.find((component) => component.type === "BODY");
  const bodyText = body?.type === "BODY" ? body.text : "";
  const category =
    result.communicationStrategy?.recommendedCategory ??
    result.policyReview?.categoryPrediction.predictedCategory ??
    "MARKETING";

  return [
    {
      id: "safe",
      label: "Segura",
      strategy: "lower_meta_risk",
      source: "derived",
      category,
      body: bodyText
        .replace(/agora/gi, "quando puder")
        .replace(/ultima chance/gi, "ainda e possivel")
        .replace(/corra/gi, "confira"),
      tradeoffs: ["menor risco Meta", "CTA mais neutro", "menor pressao comercial"],
    },
    {
      id: "balanced",
      label: "Equilibrada",
      strategy: "preserve_pipeline_output",
      source: "pipeline",
      category,
      body: bodyText,
      tradeoffs: ["mantem tom original", "preserva compliance atual", "boa base de revisao"],
    },
    {
      id: "engaging",
      label: "Mais engajadora",
      strategy: "stronger_cta",
      source: "derived",
      category,
      body: bodyText ? `${bodyText}\n\nSe fizer sentido para voce, responda esta mensagem e retomamos por aqui.` : bodyText,
      tradeoffs: ["CTA mais forte", "maior engajamento", "maior atencao a warnings"],
    },
  ];
}
