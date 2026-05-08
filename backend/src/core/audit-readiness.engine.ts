import {
  AuditChecklistCategory,
  AuditChecklistItemStatus,
  type AuditChecklistItem,
} from "./audit-checklist.model.js";
import { PolicyReviewStatus, PolicyRiskLevel, type PolicyReview } from "./policy-review.model.js";
import type { TemplateComponent } from "./template.model.js";
import type { ValidationResult } from "./semantic-template.validation.js";

export interface AuditReadinessInput {
  validation: ValidationResult;
  policyReview: PolicyReview;
  templateComponents: TemplateComponent[];
}

export class AuditReadinessEngine {
  buildChecklist(input: AuditReadinessInput): AuditChecklistItem[] {
    return [
      this.checkSemanticValidation(input.validation),
      this.checkPolicyReview(input.policyReview),
      this.checkCategoryPrediction(input.policyReview),
      this.checkRiskScore(input.policyReview),
      this.checkComponents(input.templateComponents),
      this.checkVariables(input.templateComponents),
      this.checkButtons(input.templateComponents),
      this.checkHeader(input.templateComponents),
      this.checkBody(input.templateComponents),
      this.checkHumanReview(),
      this.checkSubmissionGate(),
    ];
  }

  private checkSemanticValidation(validation: ValidationResult): AuditChecklistItem {
    return {
      id: "audit.semantic_validation",
      category: AuditChecklistCategory.SemanticValidation,
      label: "Semantic validation",
      status: validation.valid ? AuditChecklistItemStatus.Pass : AuditChecklistItemStatus.Fail,
      message: validation.valid
        ? "Semantic and structural validation passed."
        : "Semantic validation has blocking issues.",
      details: validation.issues,
    };
  }

  private checkPolicyReview(policyReview: PolicyReview): AuditChecklistItem {
    const status = policyReview.status === PolicyReviewStatus.Blocked
      ? AuditChecklistItemStatus.Fail
      : policyReview.status === PolicyReviewStatus.Approved
        ? AuditChecklistItemStatus.Pass
        : AuditChecklistItemStatus.Warning;

    return {
      id: "audit.policy_review",
      category: AuditChecklistCategory.PolicyReview,
      label: "Policy review",
      status,
      message: `Policy review status: ${policyReview.status}.`,
      details: {
        violations: policyReview.violations,
        warnings: policyReview.warnings,
      },
    };
  }

  private checkCategoryPrediction(policyReview: PolicyReview): AuditChecklistItem {
    return {
      id: "audit.category_prediction",
      category: AuditChecklistCategory.CategoryPrediction,
      label: "Category prediction",
      status: policyReview.categoryPrediction.overrideRecommended
        ? AuditChecklistItemStatus.Warning
        : AuditChecklistItemStatus.Pass,
      message: policyReview.categoryPrediction.overrideRecommended
        ? "Predicted category differs from declared category."
        : "Predicted category aligns with declared category.",
      details: policyReview.categoryPrediction,
    };
  }

  private checkRiskScore(policyReview: PolicyReview): AuditChecklistItem {
    const status =
      policyReview.risk.estimatedRisk === PolicyRiskLevel.Critical ||
      policyReview.risk.estimatedRisk === PolicyRiskLevel.High
        ? AuditChecklistItemStatus.Fail
        : policyReview.risk.estimatedRisk === PolicyRiskLevel.Medium
          ? AuditChecklistItemStatus.Warning
          : AuditChecklistItemStatus.Pass;

    return {
      id: "audit.risk_score",
      category: AuditChecklistCategory.RiskScore,
      label: "Risk score",
      status,
      message: `Estimated policy risk: ${policyReview.risk.estimatedRisk}.`,
      details: policyReview.risk,
    };
  }

  private checkComponents(components: TemplateComponent[]): AuditChecklistItem {
    return {
      id: "audit.component_readiness",
      category: AuditChecklistCategory.ComponentReadiness,
      label: "Template components",
      status: components.length > 0 ? AuditChecklistItemStatus.Pass : AuditChecklistItemStatus.Fail,
      message: components.length > 0
        ? "Template components were generated."
        : "Template components are missing.",
      details: components.map((component) => component.type),
    };
  }

  private checkVariables(components: TemplateComponent[]): AuditChecklistItem {
    const body = components.find((component) => component.type === "BODY");
    const hasVariables = Boolean(body?.text.match(/\{\{\d+\}\}/));
    const hasExamples = Boolean(body?.example?.body_text?.[0]?.length);

    return {
      id: "audit.variables_readiness",
      category: AuditChecklistCategory.VariablesReadiness,
      label: "Variables",
      status: !hasVariables || hasExamples ? AuditChecklistItemStatus.Pass : AuditChecklistItemStatus.Fail,
      message: !hasVariables
        ? "No variables required."
        : hasExamples
          ? "Variables include examples."
          : "Variables are missing examples.",
      details: body?.example,
    };
  }

  private checkButtons(components: TemplateComponent[]): AuditChecklistItem {
    const buttons = components.find((component) => component.type === "BUTTONS");

    return {
      id: "audit.buttons_readiness",
      category: AuditChecklistCategory.ButtonsReadiness,
      label: "Buttons",
      status: buttons && buttons.buttons.length > 3
        ? AuditChecklistItemStatus.Fail
        : AuditChecklistItemStatus.Pass,
      message: buttons
        ? `Button count: ${buttons.buttons.length}.`
        : "No buttons required.",
      details: buttons?.buttons ?? [],
    };
  }

  private checkHeader(components: TemplateComponent[]): AuditChecklistItem {
    const header = components.find((component) => component.type === "HEADER");

    return {
      id: "audit.header_readiness",
      category: AuditChecklistCategory.HeaderReadiness,
      label: "Header",
      status: header && header.text && header.text.length > 60
        ? AuditChecklistItemStatus.Fail
        : AuditChecklistItemStatus.Pass,
      message: header ? "Header is present and within expected limits." : "No header required.",
      details: header,
    };
  }

  private checkBody(components: TemplateComponent[]): AuditChecklistItem {
    const body = components.find((component) => component.type === "BODY");

    return {
      id: "audit.body_readiness",
      category: AuditChecklistCategory.BodyReadiness,
      label: "Body",
      status: body && body.text.length > 0 && body.text.length <= 1024
        ? AuditChecklistItemStatus.Pass
        : AuditChecklistItemStatus.Fail,
      message: body ? "Body is present and within expected limits." : "Body component is missing.",
      details: body,
    };
  }

  private checkHumanReview(): AuditChecklistItem {
    return {
      id: "audit.human_review_readiness",
      category: AuditChecklistCategory.HumanReviewReadiness,
      label: "Human review",
      status: AuditChecklistItemStatus.Pass,
      message: "Human review is required before any submission.",
    };
  }

  private checkSubmissionGate(): AuditChecklistItem {
    return {
      id: "audit.submission_readiness",
      category: AuditChecklistCategory.SubmissionReadiness,
      label: "Submission gate",
      status: AuditChecklistItemStatus.Warning,
      message: "Submission is disabled until explicit human confirmation and Meta compiler integration.",
    };
  }
}
