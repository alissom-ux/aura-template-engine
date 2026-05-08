import type { TemplateCategory } from "./enums.js";
import type { PolicySignal, PolicyViolation } from "./policy-violation.model.js";

export const PolicyReviewStatus = {
  Approved: "APPROVED",
  ApprovedWithWarnings: "APPROVED_WITH_WARNINGS",
  NeedsRevision: "NEEDS_REVISION",
  Blocked: "BLOCKED",
} as const;

export type PolicyReviewStatus =
  (typeof PolicyReviewStatus)[keyof typeof PolicyReviewStatus];

export const PolicyRiskLevel = {
  Low: "LOW",
  Medium: "MEDIUM",
  High: "HIGH",
  Critical: "CRITICAL",
} as const;

export type PolicyRiskLevel =
  (typeof PolicyRiskLevel)[keyof typeof PolicyRiskLevel];

export interface ProbabilityScore {
  probability: number;
  confidence: number;
}

export interface CategoryPrediction {
  declaredCategory: TemplateCategory;
  predictedCategory: TemplateCategory;
  overrideRecommended: boolean;
  probability: number;
  confidence: number;
  rationale: string[];
}

export interface RiskScore {
  estimatedRisk: PolicyRiskLevel;
  probability: number;
  confidence: number;
  signals: PolicySignal[];
  behavioralInterpretation: string;
}

export interface PolicySuggestion {
  id: string;
  target: "copy" | "category" | "cta" | "variables" | "business_context";
  priority: "low" | "medium" | "high";
  message: string;
  replacementHint?: string;
}

export interface PolicyReview {
  status: PolicyReviewStatus;
  approved: boolean;
  risk: RiskScore;
  categoryPrediction: CategoryPrediction;
  violations: PolicyViolation[];
  warnings: PolicyViolation[];
  suggestions: PolicySuggestion[];
  confidence: number;
  behavioralSummary: string;
}
