import type { CopyBlockSet } from "./copy-block.model.js";
import type { MessageStructure } from "./message-structure.model.js";
import type { AuditReport } from "./audit-report.model.js";
import type { PolicyReview } from "./policy-review.model.js";
import type { ValidationResult } from "./semantic-template.validation.js";
import type { SemanticTemplateModel, TemplateComponent } from "./template.model.js";
import { AuditDecisionEngine } from "./audit-decision.engine.js";
import { AuditReadinessEngine } from "./audit-readiness.engine.js";
import { AuditSummaryEngine } from "./audit-summary.engine.js";

export interface AuditEngineInput {
  validation: ValidationResult;
  policyReview: PolicyReview;
  semanticTemplateModel: SemanticTemplateModel;
  messageStructure: MessageStructure;
  copyBlocks: CopyBlockSet;
  templateComponents: TemplateComponent[];
}

export class AuditEngine {
  private readonly readiness = new AuditReadinessEngine();
  private readonly decision = new AuditDecisionEngine();
  private readonly summary = new AuditSummaryEngine();

  audit(input: AuditEngineInput): AuditReport {
    const checklist = this.readiness.buildChecklist({
      validation: input.validation,
      policyReview: input.policyReview,
      templateComponents: input.templateComponents,
    });
    const decision = this.decision.decide({
      validation: input.validation,
      policyReview: input.policyReview,
      checklist,
    });
    const summary = this.summary.summarize({
      status: decision.status,
      validation: input.validation,
      policyReview: input.policyReview,
      checklist,
    });

    return {
      status: decision.status,
      canSubmit: decision.canSubmit,
      requiresHumanReview: decision.requiresHumanReview,
      riskLevel: input.policyReview.risk.estimatedRisk,
      summary: summary.summary,
      checklist,
      blockingIssues: summary.blockingIssues,
      warnings: summary.warnings,
      recommendedActions: summary.recommendedActions,
      reviewNotes: summary.reviewNotes,
      submissionGate: decision.submissionGate,
    };
  }
}
