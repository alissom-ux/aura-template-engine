import type { AgentType } from "./enums.js";

export const DecisionKind = {
  CategoryRecommendation: "CATEGORY_RECOMMENDATION",
  CtaStrategy: "CTA_STRATEGY",
  MediaStrategy: "MEDIA_STRATEGY",
  Personalization: "PERSONALIZATION",
  RiskAssessment: "RISK_ASSESSMENT",
  PolicyInterpretation: "POLICY_INTERPRETATION",
  SemanticMapping: "SEMANTIC_MAPPING",
  PromptAssembly: "PROMPT_ASSEMBLY",
  OutputValidation: "OUTPUT_VALIDATION",
  HumanReview: "HUMAN_REVIEW",
  ApprovalGate: "APPROVAL_GATE",
} as const;

export type DecisionKind = (typeof DecisionKind)[keyof typeof DecisionKind];

export const DecisionConfidence = {
  Low: "LOW",
  Medium: "MEDIUM",
  High: "HIGH",
} as const;

export type DecisionConfidence =
  (typeof DecisionConfidence)[keyof typeof DecisionConfidence];

export interface DecisionTraceEntry {
  id: string;
  executionId: string;
  agent: AgentType;
  kind: DecisionKind;
  summary: string;
  inputs: DecisionTraceReference[];
  output: DecisionTraceReference;
  rationale: string[];
  confidence: DecisionConfidence;
  createdAt: string;
}

export interface DecisionTraceReference {
  label: string;
  value: unknown;
}

export interface DecisionTrace {
  executionId: string;
  entries: DecisionTraceEntry[];
}

export interface CreateDecisionTraceEntryInput {
  executionId: string;
  agent: AgentType;
  kind: DecisionKind;
  summary: string;
  inputs?: DecisionTraceReference[];
  output: DecisionTraceReference;
  rationale?: string[];
  confidence?: DecisionConfidence;
}
