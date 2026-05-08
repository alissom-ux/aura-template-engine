export interface PipelineRequest {
  userPrompt: string;
  businessContext: {
    companyName: string;
    industry: string;
    brandVoice: string;
  };
  defaults: {
    category: "MARKETING" | "UTILITY" | "AUTHENTICATION";
    language: string;
  };
}

export interface PipelineResponse {
  success: boolean;
  executionId?: string;
  nextStep?: string;
  warnings?: string[];
  errors?: PipelineError[];
  auditReport?: AuditReport;
  policyReview?: PolicyReview;
  templateComponents?: TemplateComponent[];
}

export interface PipelineError {
  code: string;
  message: string;
  details?: unknown;
}

export interface AuditReport {
  status: "READY_FOR_REVIEW" | "NEEDS_FIXES" | "BLOCKED";
  summary: string;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  blockingIssues: string[];
  warnings: string[];
  recommendedActions: string[];
  reviewNotes: string[];
  checklist: Array<{
    id: string;
    label: string;
    status: "PASS" | "WARNING" | "FAIL";
    message: string;
  }>;
  submissionGate: {
    allowed: boolean;
    reason: string;
    requiresExplicitConfirmation: boolean;
  };
}

export interface PolicyReview {
  status: string;
  approved: boolean;
  confidence: number;
  behavioralSummary: string;
  risk: {
    estimatedRisk: string;
    probability: number;
    confidence: number;
  };
  categoryPrediction: {
    declaredCategory: string;
    predictedCategory: string;
    overrideRecommended: boolean;
    probability: number;
    confidence: number;
  };
  violations: Array<{
    id: string;
    severity: string;
    rule: string;
    behavioralInterpretation: string;
    affectedText: string;
  }>;
  warnings: Array<{
    id: string;
    severity: string;
    rule: string;
    behavioralInterpretation: string;
    affectedText: string;
  }>;
  suggestions: Array<{
    id: string;
    priority: string;
    message: string;
    target: string;
  }>;
}

export type TemplateComponent =
  | { type: "HEADER"; format: string; text?: string }
  | { type: "BODY"; text: string; example?: { body_text: string[][] } }
  | { type: "FOOTER"; text: string }
  | { type: "BUTTONS"; buttons: TemplateButton[] };

export type TemplateButton =
  | { type: "QUICK_REPLY"; text: string }
  | { type: "URL"; text: string; url: string }
  | { type: "PHONE_NUMBER"; text: string; phone_number: string }
  | { type: "COPY_CODE"; example: string };
