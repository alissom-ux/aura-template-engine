import { AuditChecklistItemStatus, type AuditChecklistItem } from "./audit-checklist.model.js";
import { AuditReportStatus } from "./audit-report.model.js";
import type { PolicyReview } from "./policy-review.model.js";
import type { ValidationResult } from "./semantic-template.validation.js";

export interface AuditSummaryInput {
  status: AuditReportStatus;
  validation: ValidationResult;
  policyReview: PolicyReview;
  checklist: AuditChecklistItem[];
}

export interface AuditSummary {
  summary: string;
  blockingIssues: string[];
  warnings: string[];
  recommendedActions: string[];
  reviewNotes: string[];
}

export class AuditSummaryEngine {
  summarize(input: AuditSummaryInput): AuditSummary {
    const blockingIssues = [
      ...input.validation.issues
        .filter((issue) => issue.severity === "error")
        .map((issue) => issue.message),
      ...input.policyReview.violations.map((violation) => violation.rule),
      ...input.checklist
        .filter((item) => item.status === AuditChecklistItemStatus.Fail)
        .map((item) => item.message),
    ];

    const warnings = [
      ...input.validation.issues
        .filter((issue) => issue.severity === "warning")
        .map((issue) => issue.message),
      ...input.policyReview.warnings.map((warning) => warning.behavioralInterpretation),
      ...input.checklist
        .filter((item) => item.status === AuditChecklistItemStatus.Warning)
        .map((item) => item.message),
    ];

    const recommendedActions = [
      ...input.policyReview.suggestions.map((suggestion) => suggestion.message),
      ...(input.status === AuditReportStatus.ReadyForReview
        ? ["Review the rendered template with a human approver before any submission."]
        : []),
      ...(input.status !== AuditReportStatus.ReadyForReview
        ? ["Resolve blocking issues and regenerate the audit report."]
        : []),
    ];

    const reviewNotes = [
      `Policy confidence: ${input.policyReview.confidence.toFixed(2)}.`,
      `Category prediction: ${input.policyReview.categoryPrediction.predictedCategory}.`,
      `Risk interpretation: ${input.policyReview.behavioralSummary}`,
    ];

    return {
      summary: this.buildSummary(input.status, blockingIssues.length, warnings.length),
      blockingIssues: unique(blockingIssues),
      warnings: unique(warnings),
      recommendedActions: unique(recommendedActions),
      reviewNotes,
    };
  }

  private buildSummary(status: AuditReportStatus, blockingCount: number, warningCount: number): string {
    if (status === AuditReportStatus.Blocked) {
      return `Audit blocked the draft with ${blockingCount} blocking issue(s).`;
    }
    if (status === AuditReportStatus.NeedsFixes) {
      return `Audit found issues that should be fixed before human approval. Warnings: ${warningCount}.`;
    }
    return `Draft is ready for human review with ${warningCount} warning(s). Submission remains gated.`;
  }
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}
