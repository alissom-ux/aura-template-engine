import { randomUUID } from "node:crypto";
import type { BusinessContext, HumanReviewState, ReviewSession } from "../core/index.js";
import {
  AgentExecutionArtifacts,
  AgentType,
  ApprovalGateEngine,
  AuditEngine,
  AuditReportStatus,
  BusinessExampleType,
  BusinessPolicySeverity,
  CommunicationRiskLevel,
  DecisionConfidence,
  DecisionKind,
  ExecutionArtifactType,
  ExecutionStatus,
  MemoryKind,
  MemoryScope,
  PolicyReviewEngine,
  PolicyReviewStatus,
  PromptAssemblyService,
  RealizationEngine,
  ReviewSessionStatus,
  StrategistEngine,
  TonePrimary,
  validateSemanticTemplate,
} from "../core/index.js";
import type {
  PipelineBusinessContextResolution,
  PipelineError,
  TemplateDraftPipelineRequest,
  TemplateDraftPipelineResult,
} from "./pipeline.types.js";
import { ReviewService } from "../review/index.js";

export class TemplatePipelineOrchestrator {
  private readonly promptAssembly = new PromptAssemblyService();
  private readonly strategistEngine = new StrategistEngine();
  private readonly realizationEngine = new RealizationEngine();
  private readonly policyReviewEngine = new PolicyReviewEngine();
  private readonly auditEngine = new AuditEngine();
  private readonly approvalGateEngine = new ApprovalGateEngine();
  private readonly reviewService = new ReviewService();

  async createDraft(request: TemplateDraftPipelineRequest): Promise<TemplateDraftPipelineResult> {
    let executionContext = this.promptAssembly.createExecutionContext({
      request: {
        intent: request.userPrompt,
        businessContextId: "pending_resolution",
        category: request.defaults?.category,
        language: request.defaults?.language,
      },
    });

    try {
      const resolved = this.resolveBusinessContext(request);
      const warnings = [...resolved.warnings];

      executionContext = {
        ...executionContext,
        request: {
          intent: request.userPrompt,
          businessContextId: resolved.businessContext.id,
          category: request.defaults?.category,
          language: request.defaults?.language ?? "pt_BR",
        },
        status: ExecutionStatus.Running,
        businessContext: resolved.businessContext,
        updatedAt: new Date().toISOString(),
      };

      executionContext = this.recordBusinessContextArtifact(executionContext, resolved.businessContext);

      const strategistResult = this.strategistEngine.run({
        rawIntent: request.userPrompt,
        businessContextId: resolved.businessContext.id,
        requestedCategory: request.defaults?.category,
        language: request.defaults?.language,
        businessContext: resolved.businessContext,
      });

      executionContext = {
        ...executionContext,
        campaignIntent: strategistResult.campaignIntent,
        communicationStrategy: strategistResult.communicationStrategy,
        semanticTemplateModel: strategistResult.semanticTemplateModel,
        updatedAt: new Date().toISOString(),
      };

      executionContext = this.recordStrategyArtifacts(executionContext, strategistResult);
      executionContext = this.recordStrategyDecisions(executionContext, strategistResult);

      const realization = this.realizationEngine.realize({
        businessContext: resolved.businessContext,
        communicationStrategy: strategistResult.communicationStrategy,
        semanticTemplateModel: strategistResult.semanticTemplateModel,
      });
      warnings.push(...realization.warnings);
      executionContext = this.recordRealizationArtifacts(executionContext, realization);
      executionContext = this.recordRealizationDecisions(executionContext, realization);

      const validation = validateSemanticTemplate({
        name: createTemplateName(request.userPrompt),
        category: strategistResult.communicationStrategy.recommendedCategory,
        components: realization.templateComponents.components,
      });

      executionContext = this.promptAssembly.addArtifact(executionContext, {
        type: ExecutionArtifactType.ValidationResult,
        owner: AgentType.PolicyReviewer,
        label: "initial_validation",
        value: validation,
      });
      executionContext = this.promptAssembly.addDecision(executionContext, {
        executionId: executionContext.id,
        agent: AgentType.PolicyReviewer,
        kind: DecisionKind.OutputValidation,
        summary: validation.valid
          ? "Realized template components passed structural validation."
          : "Realized template components failed structural validation.",
        inputs: [{ label: "templateComponents", value: realization.templateComponents.components }],
        output: { label: "validation", value: validation },
        rationale: ["Validation uses realized deterministic components before any IA or Meta compiler step."],
        confidence: validation.valid ? DecisionConfidence.High : DecisionConfidence.Medium,
      });

      for (const issue of validation.issues.filter((item) => item.severity === "warning")) {
        warnings.push(issue.message);
      }

      const policyReview = this.policyReviewEngine.review({
        businessContext: resolved.businessContext,
        campaignIntent: strategistResult.campaignIntent,
        communicationStrategy: strategistResult.communicationStrategy,
        semanticTemplateModel: strategistResult.semanticTemplateModel,
        messageStructure: realization.messageStructure,
        copyBlocks: realization.copyBlocks,
        templateComponents: realization.templateComponents.components,
      });
      warnings.push(...policyReview.warnings.map((warning) => warning.behavioralInterpretation));
      executionContext = this.recordPolicyReviewArtifacts(executionContext, policyReview);
      executionContext = this.recordPolicyReviewDecisions(executionContext, policyReview);

      if (strategistResult.communicationStrategy.risk.level !== CommunicationRiskLevel.Low) {
        warnings.push(...strategistResult.communicationStrategy.risk.reasons);
        executionContext = this.promptAssembly.addMemory(executionContext, {
          executionId: executionContext.id,
          businessContextId: resolved.businessContext.id,
          agent: AgentType.PolicyReviewer,
          scope: MemoryScope.Execution,
          kind: MemoryKind.Warning,
          key: "communication_risk",
          value: strategistResult.communicationStrategy.risk,
          summary: "Communication strategy includes non-low risk signals.",
          tags: ["risk", "strategy"],
        });
      }

      if (policyReview.status !== PolicyReviewStatus.Approved) {
        executionContext = this.promptAssembly.addMemory(executionContext, {
          executionId: executionContext.id,
          businessContextId: resolved.businessContext.id,
          agent: AgentType.PolicyReviewer,
          scope: MemoryScope.Execution,
          kind: policyReview.approved ? MemoryKind.Warning : MemoryKind.Constraint,
          key: "policy_review",
          value: policyReview,
          summary: "Policy review produced warnings, revision requirements, or violations.",
          tags: ["policy", "risk"],
        });
      }

      const auditReport = this.auditEngine.audit({
        validation,
        policyReview,
        semanticTemplateModel: strategistResult.semanticTemplateModel,
        messageStructure: realization.messageStructure,
        copyBlocks: realization.copyBlocks,
        templateComponents: realization.templateComponents.components,
      });
      executionContext = this.recordAuditArtifacts(executionContext, auditReport);
      executionContext = this.recordAuditDecision(executionContext, auditReport);

      const reviewSessionId = randomUUID();
      const reviewSnapshot = this.approvalGateEngine.createSnapshot({
        reviewSessionId,
        version: 1,
        campaignIntent: strategistResult.campaignIntent,
        communicationStrategy: strategistResult.communicationStrategy,
        semanticTemplate: strategistResult.semanticTemplateModel,
        messageStructure: realization.messageStructure,
        copyBlocks: realization.copyBlocks,
        templateComponents: realization.templateComponents.components,
        validation,
        policyReview,
        auditReport,
      });
      const reviewSession = this.approvalGateEngine.createReviewSession({
        executionId: executionContext.id,
        snapshot: reviewSnapshot,
      });
      this.reviewService.saveSession(reviewSession);
      const humanReview = createHumanReviewState(reviewSession);
      executionContext = this.recordHumanReviewArtifacts(executionContext, reviewSession);
      executionContext = this.recordHumanReviewDecision(executionContext, humanReview);

      if (auditReport.status !== AuditReportStatus.ReadyForReview) {
        return {
          success: false,
          executionId: executionContext.id,
          campaignIntent: strategistResult.campaignIntent,
          communicationStrategy: strategistResult.communicationStrategy,
          semanticTemplate: strategistResult.semanticTemplateModel,
          messageStructure: realization.messageStructure,
          copyBlocks: realization.copyBlocks,
          templateComponents: realization.templateComponents.components,
          policyReview,
          validation,
          auditReport,
          humanReview,
          reviewSession,
          reviewSnapshot,
          decisionTrace: executionContext.decisions,
          warnings: unique([...warnings, ...auditReport.warnings]),
          errors: buildAuditErrors(validation, policyReview, auditReport),
          nextStep: validation.valid ? "fix_policy_violations" : "fix_validation_errors",
        };
      }

      executionContext = {
        ...executionContext,
        status: ExecutionStatus.Completed,
        updatedAt: new Date().toISOString(),
      };

      return {
        success: true,
        executionId: executionContext.id,
        campaignIntent: strategistResult.campaignIntent,
        communicationStrategy: strategistResult.communicationStrategy,
        semanticTemplate: strategistResult.semanticTemplateModel,
        messageStructure: realization.messageStructure,
        copyBlocks: realization.copyBlocks,
        templateComponents: realization.templateComponents.components,
        policyReview,
        validation,
        auditReport,
        humanReview,
        reviewSession,
        reviewSnapshot,
        decisionTrace: executionContext.decisions,
        warnings: unique([...warnings, ...auditReport.warnings]),
        nextStep: "review_template",
      };
    } catch (error) {
      executionContext = this.promptAssembly.addError(executionContext, {
        code: "pipeline.failed",
        message: error instanceof Error ? error.message : "Unknown pipeline error",
        recoverable: false,
      });

      return {
        success: false,
        executionId: executionContext.id,
        decisionTrace: executionContext.decisions,
        warnings: [],
        errors: executionContext.errors.map((item) => ({
          code: item.code,
          message: item.message,
        })),
        nextStep: "pipeline_failed",
      };
    }
  }

  private resolveBusinessContext(
    request: TemplateDraftPipelineRequest
  ): PipelineBusinessContextResolution {
    const warnings: string[] = [];
    const input = request.businessContext;

    if (!input.description) {
      warnings.push("Business context description was inferred from companyName and industry.");
    }
    if (!input.audience) {
      warnings.push("Audience was not provided; a generic audience profile was inferred.");
    }

    const businessContext: BusinessContext = {
      id: randomUUID(),
      name: input.companyName,
      segment: input.industry,
      description: input.description ?? `${input.companyName} operates in ${input.industry}.`,
      tone: {
        primary: inferTone(input.brandVoice),
        avoid: [],
        guidelines: input.brandVoice,
      },
      audience: {
        description: input.audience ?? "People who have an existing or potential relationship with the business.",
        painPoints: [],
        expectations: ["clear communication", "relevant information", "simple next step"],
      },
      policies: [
        {
          id: "business.no_unverifiable_claims",
          rule: "Avoid unverifiable claims or guarantees not provided by the business context.",
          severity: BusinessPolicySeverity.Warn,
        },
      ],
      examples: [
        {
          type: BusinessExampleType.CommunicationSample,
          content: input.brandVoice,
          notes: "Brand voice supplied in the draft request.",
        },
      ],
      complianceNotes: input.complianceNotes,
      createdAt: new Date().toISOString(),
    };

    return { businessContext, warnings };
  }

  private recordBusinessContextArtifact(
    executionContext: ReturnType<PromptAssemblyService["createExecutionContext"]>,
    businessContext: BusinessContext
  ) {
    return this.promptAssembly.addArtifact(executionContext, {
      type: AgentExecutionArtifacts.AgentOutput,
      owner: "system",
      label: "resolved_business_context",
      value: businessContext,
    });
  }

  private recordStrategyArtifacts(
    executionContext: ReturnType<PromptAssemblyService["createExecutionContext"]>,
    strategistResult: ReturnType<StrategistEngine["run"]>
  ) {
    let nextContext = this.promptAssembly.addArtifact(executionContext, {
      type: ExecutionArtifactType.CampaignIntent,
      owner: AgentType.Strategist,
      label: "campaign_intent",
      value: strategistResult.campaignIntent,
    });
    nextContext = this.promptAssembly.addArtifact(nextContext, {
      type: ExecutionArtifactType.CommunicationStrategy,
      owner: AgentType.Strategist,
      label: "communication_strategy",
      value: strategistResult.communicationStrategy,
    });
    nextContext = this.promptAssembly.addArtifact(nextContext, {
      type: ExecutionArtifactType.SemanticTemplateModel,
      owner: AgentType.Strategist,
      label: "semantic_template_model",
      value: strategistResult.semanticTemplateModel,
    });

    return nextContext;
  }

  private recordStrategyDecisions(
    executionContext: ReturnType<PromptAssemblyService["createExecutionContext"]>,
    strategistResult: ReturnType<StrategistEngine["run"]>
  ) {
    let nextContext = this.promptAssembly.addDecision(executionContext, {
      executionId: executionContext.id,
      agent: AgentType.Strategist,
      kind: DecisionKind.CategoryRecommendation,
      summary: "Recommended template category from campaign intent and business context.",
      inputs: [{ label: "campaignIntent", value: strategistResult.campaignIntent }],
      output: {
        label: "recommendedCategory",
        value: strategistResult.communicationStrategy.recommendedCategory,
      },
      rationale: strategistResult.communicationStrategy.rationale,
      confidence: DecisionConfidence.High,
    });

    nextContext = this.promptAssembly.addDecision(nextContext, {
      executionId: nextContext.id,
      agent: AgentType.Strategist,
      kind: DecisionKind.CtaStrategy,
      summary: "Selected CTA strategy for the communication.",
      output: { label: "cta", value: strategistResult.communicationStrategy.cta },
      rationale: [strategistResult.communicationStrategy.cta.rationale],
      confidence: DecisionConfidence.Medium,
    });

    nextContext = this.promptAssembly.addDecision(nextContext, {
      executionId: nextContext.id,
      agent: AgentType.Strategist,
      kind: DecisionKind.RiskAssessment,
      summary: "Assessed communication risk before copy generation.",
      output: { label: "risk", value: strategistResult.communicationStrategy.risk },
      rationale: strategistResult.communicationStrategy.risk.mitigationHints,
      confidence: DecisionConfidence.Medium,
    });

    return this.promptAssembly.addDecision(nextContext, {
      executionId: nextContext.id,
      agent: AgentType.Strategist,
      kind: DecisionKind.SemanticMapping,
      summary: "Mapped communication strategy into the initial semantic template model.",
      output: { label: "semanticTemplateModel", value: strategistResult.semanticTemplateModel },
      rationale: ["Semantic model is derived from strategy before copywriting or Meta compilation."],
      confidence: DecisionConfidence.High,
    });
  }

  private recordRealizationArtifacts(
    executionContext: ReturnType<PromptAssemblyService["createExecutionContext"]>,
    realization: ReturnType<RealizationEngine["realize"]>
  ) {
    let nextContext = this.promptAssembly.addArtifact(executionContext, {
      type: ExecutionArtifactType.AgentOutput,
      owner: AgentType.Copywriter,
      label: "message_structure",
      value: realization.messageStructure,
    });
    nextContext = this.promptAssembly.addArtifact(nextContext, {
      type: ExecutionArtifactType.AgentOutput,
      owner: AgentType.Copywriter,
      label: "copy_blocks",
      value: realization.copyBlocks,
    });
    nextContext = this.promptAssembly.addArtifact(nextContext, {
      type: ExecutionArtifactType.AgentOutput,
      owner: AgentType.Copywriter,
      label: "template_components",
      value: realization.templateComponents.components,
    });

    return nextContext;
  }

  private recordRealizationDecisions(
    executionContext: ReturnType<PromptAssemblyService["createExecutionContext"]>,
    realization: ReturnType<RealizationEngine["realize"]>
  ) {
    let nextContext = this.promptAssembly.addDecision(executionContext, {
      executionId: executionContext.id,
      agent: AgentType.Copywriter,
      kind: DecisionKind.SemanticMapping,
      summary: "Realized semantic template into message structure.",
      output: { label: "messageStructure", value: realization.messageStructure },
      rationale: ["Message structure separates strategy from textual realization."],
      confidence: DecisionConfidence.High,
    });

    nextContext = this.promptAssembly.addDecision(nextContext, {
      executionId: nextContext.id,
      agent: AgentType.Copywriter,
      kind: DecisionKind.SemanticMapping,
      summary: "Generated deterministic copy blocks from message structure.",
      output: { label: "copyBlocks", value: realization.copyBlocks },
      rationale: ["Copy blocks are reusable units that can support future A/B variants."],
      confidence: DecisionConfidence.Medium,
    });

    return this.promptAssembly.addDecision(nextContext, {
      executionId: nextContext.id,
      agent: AgentType.Compiler,
      kind: DecisionKind.SemanticMapping,
      summary: "Built channel-facing template components from copy blocks.",
      output: { label: "templateComponents", value: realization.templateComponents.components },
      rationale: ["Template components are built without invoking the Meta compiler."],
      confidence: DecisionConfidence.High,
    });
  }

  private recordPolicyReviewArtifacts(
    executionContext: ReturnType<PromptAssemblyService["createExecutionContext"]>,
    policyReview: ReturnType<PolicyReviewEngine["review"]>
  ) {
    return this.promptAssembly.addArtifact(executionContext, {
      type: ExecutionArtifactType.AgentOutput,
      owner: AgentType.PolicyReviewer,
      label: "policy_review",
      value: policyReview,
    });
  }

  private recordPolicyReviewDecisions(
    executionContext: ReturnType<PromptAssemblyService["createExecutionContext"]>,
    policyReview: ReturnType<PolicyReviewEngine["review"]>
  ) {
    let nextContext = this.promptAssembly.addDecision(executionContext, {
      executionId: executionContext.id,
      agent: AgentType.PolicyReviewer,
      kind: DecisionKind.RiskAssessment,
      summary: "Estimated Meta-style behavioral policy risk.",
      output: { label: "risk", value: policyReview.risk },
      rationale: [policyReview.risk.behavioralInterpretation],
      confidence: DecisionConfidence.Medium,
    });

    nextContext = this.promptAssembly.addDecision(nextContext, {
      executionId: nextContext.id,
      agent: AgentType.PolicyReviewer,
      kind: DecisionKind.CategoryRecommendation,
      summary: "Predicted recipient and Meta category interpretation.",
      output: { label: "categoryPrediction", value: policyReview.categoryPrediction },
      rationale: policyReview.categoryPrediction.rationale,
      confidence: policyReview.categoryPrediction.overrideRecommended
        ? DecisionConfidence.Medium
        : DecisionConfidence.High,
    });

    return this.promptAssembly.addDecision(nextContext, {
      executionId: nextContext.id,
      agent: AgentType.PolicyReviewer,
      kind: DecisionKind.PolicyInterpretation,
      summary: "Completed deterministic policy review.",
      output: { label: "policyReview", value: policyReview },
      rationale: [policyReview.behavioralSummary],
      confidence: policyReview.confidence >= 0.75 ? DecisionConfidence.High : DecisionConfidence.Medium,
    });
  }

  private recordAuditArtifacts(
    executionContext: ReturnType<PromptAssemblyService["createExecutionContext"]>,
    auditReport: ReturnType<AuditEngine["audit"]>
  ) {
    return this.promptAssembly.addArtifact(executionContext, {
      type: ExecutionArtifactType.AgentOutput,
      owner: AgentType.Auditor,
      label: "audit_report",
      value: auditReport,
    });
  }

  private recordAuditDecision(
    executionContext: ReturnType<PromptAssemblyService["createExecutionContext"]>,
    auditReport: ReturnType<AuditEngine["audit"]>
  ) {
    return this.promptAssembly.addDecision(executionContext, {
      executionId: executionContext.id,
      agent: AgentType.Auditor,
      kind: DecisionKind.OutputValidation,
      summary: "Consolidated final operational audit report.",
      output: { label: "auditReport", value: auditReport },
      rationale: [
        auditReport.summary,
        auditReport.submissionGate.reason,
      ],
      confidence: auditReport.status === AuditReportStatus.ReadyForReview
        ? DecisionConfidence.High
        : DecisionConfidence.Medium,
    });
  }

  private recordHumanReviewArtifacts(
    executionContext: ReturnType<PromptAssemblyService["createExecutionContext"]>,
    reviewSession: ReviewSession
  ) {
    let nextContext = this.promptAssembly.addArtifact(executionContext, {
      type: ExecutionArtifactType.AgentOutput,
      owner: "system",
      label: "review_snapshot",
      value: reviewSession.currentSnapshot,
    });

    nextContext = this.promptAssembly.addArtifact(nextContext, {
      type: ExecutionArtifactType.AgentOutput,
      owner: "system",
      label: "review_session",
      value: reviewSession,
    });

    return this.promptAssembly.addArtifact(nextContext, {
      type: ExecutionArtifactType.AgentOutput,
      owner: "system",
      label: "approval_gate",
      value: reviewSession.approvalGate,
    });
  }

  private recordHumanReviewDecision(
    executionContext: ReturnType<PromptAssemblyService["createExecutionContext"]>,
    humanReview: HumanReviewState
  ) {
    let nextContext = this.promptAssembly.addDecision(executionContext, {
      executionId: executionContext.id,
      agent: AgentType.Auditor,
      kind: DecisionKind.HumanReview,
      summary: "Created human review session and immutable audit snapshot.",
      output: { label: "humanReview", value: humanReview },
      rationale: [
        "Human review is required before compiler handoff.",
        `Snapshot hash: ${humanReview.snapshotHash}.`,
      ],
      confidence: DecisionConfidence.High,
    });

    return this.promptAssembly.addDecision(nextContext, {
      executionId: nextContext.id,
      agent: AgentType.Compiler,
      kind: DecisionKind.ApprovalGate,
      summary: "Evaluated approval gate for future compiler access.",
      output: { label: "approvalGate", value: humanReview.approvalGate },
      rationale: [humanReview.approvalGate.reason],
      confidence: DecisionConfidence.High,
    });
  }
}

function inferTone(brandVoice: string): TonePrimary {
  const normalized = normalize(brandVoice);
  if (normalized.includes("tecnico") || normalized.includes("technical")) return TonePrimary.Technical;
  if (normalized.includes("formal")) return TonePrimary.Formal;
  if (normalized.includes("informal")) return TonePrimary.Informal;
  if (normalized.includes("urgente") || normalized.includes("urgency")) return TonePrimary.Urgency;
  return TonePrimary.Empathetic;
}

function buildAuditErrors(
  validation: ReturnType<typeof validateSemanticTemplate>,
  policyReview: ReturnType<PolicyReviewEngine["review"]>,
  auditReport: ReturnType<AuditEngine["audit"]>
): PipelineError[] {
  return [
    ...validation.issues
      .filter((issue) => issue.severity === "error")
      .map((issue) => ({
        code: issue.code,
        message: issue.message,
        details: { path: issue.path },
      })),
    ...policyReview.violations.map((violation) => ({
      code: violation.signalType,
      message: violation.rule,
      details: violation,
    })),
    ...auditReport.blockingIssues.map((issue) => ({
      code: "audit.blocking_issue",
      message: issue,
    })),
  ];
}

function createHumanReviewState(reviewSession: ReviewSession): HumanReviewState {
  return {
    required: true,
    status: reviewSession.status,
    reviewSessionId: reviewSession.id,
    snapshotId: reviewSession.currentSnapshot.id,
    snapshotVersion: reviewSession.currentSnapshot.version,
    snapshotHash: reviewSession.currentSnapshot.hash,
    approvalGate: reviewSession.approvalGate,
    nextAction: reviewSession.status === ReviewSessionStatus.PendingReview
      ? "approve"
      : reviewSession.status === ReviewSessionStatus.ChangesRequested
        ? "request_changes"
        : "reject",
  };
}

function createTemplateName(userPrompt: string): string {
  const normalized = normalize(userPrompt)
    .replace(/[^a-z0-9\s_]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .slice(0, 80);

  return normalized.length > 0 ? normalized : "template_draft";
}

function truncate(value: string, maxLength: number): string {
  return value.length <= maxLength ? value : value.slice(0, maxLength);
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}
