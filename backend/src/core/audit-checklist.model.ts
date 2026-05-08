export const AuditChecklistItemStatus = {
  Pass: "PASS",
  Warning: "WARNING",
  Fail: "FAIL",
} as const;

export type AuditChecklistItemStatus =
  (typeof AuditChecklistItemStatus)[keyof typeof AuditChecklistItemStatus];

export const AuditChecklistCategory = {
  SemanticValidation: "SEMANTIC_VALIDATION",
  PolicyReview: "POLICY_REVIEW",
  CategoryPrediction: "CATEGORY_PREDICTION",
  RiskScore: "RISK_SCORE",
  ComponentReadiness: "COMPONENT_READINESS",
  VariablesReadiness: "VARIABLES_READINESS",
  ButtonsReadiness: "BUTTONS_READINESS",
  HeaderReadiness: "HEADER_READINESS",
  BodyReadiness: "BODY_READINESS",
  HumanReviewReadiness: "HUMAN_REVIEW_READINESS",
  SubmissionReadiness: "SUBMISSION_READINESS",
} as const;

export type AuditChecklistCategory =
  (typeof AuditChecklistCategory)[keyof typeof AuditChecklistCategory];

export interface AuditChecklistItem {
  id: string;
  category: AuditChecklistCategory;
  label: string;
  status: AuditChecklistItemStatus;
  message: string;
  details?: unknown;
}
