import type { AuditChecklistItem } from "./audit-checklist.model.js";
import type { PolicyRiskLevel } from "./policy-review.model.js";

export const AuditReportStatus = {
  ReadyForReview: "READY_FOR_REVIEW",
  NeedsFixes: "NEEDS_FIXES",
  Blocked: "BLOCKED",
} as const;

export type AuditReportStatus =
  (typeof AuditReportStatus)[keyof typeof AuditReportStatus];

export interface SubmissionGate {
  allowed: boolean;
  reason: string;
  requiresExplicitConfirmation: true;
}

export interface AuditReport {
  status: AuditReportStatus;
  canSubmit: boolean;
  requiresHumanReview: boolean;
  riskLevel: PolicyRiskLevel;
  summary: string;
  checklist: AuditChecklistItem[];
  blockingIssues: string[];
  warnings: string[];
  recommendedActions: string[];
  reviewNotes: string[];
  submissionGate: SubmissionGate;
}
