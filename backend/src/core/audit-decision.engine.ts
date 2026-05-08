import { AuditChecklistItemStatus, type AuditChecklistItem } from "./audit-checklist.model.js";
import { AuditReportStatus, type SubmissionGate } from "./audit-report.model.js";
import { PolicyReviewStatus, PolicyRiskLevel, type PolicyReview } from "./policy-review.model.js";
import type { ValidationResult } from "./semantic-template.validation.js";

export interface AuditDecisionInput {
  validation: ValidationResult;
  policyReview: PolicyReview;
  checklist: AuditChecklistItem[];
}

export interface AuditDecision {
  status: AuditReportStatus;
  canSubmit: boolean;
  requiresHumanReview: boolean;
  submissionGate: SubmissionGate;
}

export class AuditDecisionEngine {
  decide(input: AuditDecisionInput): AuditDecision {
    const hasValidationFailure = !input.validation.valid;
    const hasChecklistFailure = input.checklist.some((item) => item.status === AuditChecklistItemStatus.Fail);
    const hasPolicyBlock =
      input.policyReview.status === PolicyReviewStatus.Blocked ||
      input.policyReview.risk.estimatedRisk === PolicyRiskLevel.Critical;
    const hasHighPolicyRisk = input.policyReview.risk.estimatedRisk === PolicyRiskLevel.High;

    const status = hasValidationFailure || hasPolicyBlock
      ? AuditReportStatus.Blocked
      : hasChecklistFailure || hasHighPolicyRisk || input.policyReview.status === PolicyReviewStatus.NeedsRevision
        ? AuditReportStatus.NeedsFixes
        : AuditReportStatus.ReadyForReview;

    return {
      status,
      canSubmit: false,
      requiresHumanReview: true,
      submissionGate: {
        allowed: false,
        reason: this.resolveGateReason(status),
        requiresExplicitConfirmation: true,
      },
    };
  }

  private resolveGateReason(status: AuditReportStatus): string {
    if (status === AuditReportStatus.Blocked) {
      return "Submission blocked by validation or policy issues.";
    }
    if (status === AuditReportStatus.NeedsFixes) {
      return "Submission disabled until recommended fixes are resolved and reviewed.";
    }
    return "Submission disabled until human review is completed and the Meta compiler is available.";
  }
}
