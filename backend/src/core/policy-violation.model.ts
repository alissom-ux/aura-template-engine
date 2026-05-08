import type { TemplateCategory } from "./enums.js";

export const PolicyViolationSeverity = {
  Info: "INFO",
  Warn: "WARN",
  Block: "BLOCK",
} as const;

export type PolicyViolationSeverity =
  (typeof PolicyViolationSeverity)[keyof typeof PolicyViolationSeverity];

export const PolicySignalType = {
  SpamPressure: "SPAM_PRESSURE",
  Manipulation: "MANIPULATION",
  UnsupportedClaim: "UNSUPPORTED_CLAIM",
  CategoryMismatch: "CATEGORY_MISMATCH",
  SensitiveDomain: "SENSITIVE_DOMAIN",
  MissingContext: "MISSING_CONTEXT",
  FormattingRisk: "FORMATTING_RISK",
  TrustAndSafety: "TRUST_AND_SAFETY",
} as const;

export type PolicySignalType =
  (typeof PolicySignalType)[keyof typeof PolicySignalType];

export interface PolicySignal {
  type: PolicySignalType;
  label: string;
  evidence: string[];
  weight: number;
  behavioralInterpretation: string;
}

export interface PolicyViolation {
  id: string;
  severity: PolicyViolationSeverity;
  signalType: PolicySignalType;
  rule: string;
  behavioralInterpretation: string;
  affectedText: string;
  estimatedCategory?: TemplateCategory;
  suggestionIds: string[];
}
