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
  campaignIntent?: CampaignIntent;
  communicationStrategy?: CommunicationStrategy;
  auditReport?: AuditReport;
  policyReview?: PolicyReview;
  templateComponents?: TemplateComponent[];
  humanReview?: HumanReview;
  reviewSession?: ReviewSession;
  reviewSnapshot?: ReviewSnapshot;
  decisionTrace?: DecisionTraceEntry[];
  persistence?: PersistenceResult;
}

export interface PipelineError {
  code: string;
  message: string;
  details?: unknown;
}

export interface CampaignIntent {
  type?: string;
  goal?: string;
  audience?: string;
  [key: string]: unknown;
}

export interface CommunicationStrategy {
  recommendedCategory?: string;
  messagingGoal?: string;
  rationale?: string[];
  keyMessages?: string[];
  suggestedVariables?: Array<{
    name?: string;
    example?: string;
    description?: string;
    [key: string]: unknown;
  }>;
  cta?: {
    label?: string;
    type?: string;
    rationale?: string;
    [key: string]: unknown;
  };
  risk?: {
    level?: string;
    reasons?: string[];
    mitigationHints?: string[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface HumanReview {
  required: boolean;
  status: string;
  reviewSessionId: string;
  snapshotId: string;
  snapshotVersion: number;
  snapshotHash: string;
  nextAction: string;
  approvalGate: {
    status: string;
    canCompile: boolean;
    canSubmit: boolean;
    reason: string;
    requiresExplicitApproval: boolean;
    approvalToken?: string;
  };
}

export interface ReviewSession {
  id: string;
  executionId?: string;
  status: string;
  version: number;
  approvalGate: HumanReview["approvalGate"];
  currentSnapshot?: ReviewSnapshot;
  decisions?: ApprovalDecision[];
  history?: {
    reviewSessionId: string;
    events: ReviewHistoryEvent[];
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface ReviewSnapshot {
  id: string;
  reviewSessionId: string;
  version: number;
  hash: string;
  immutable: boolean;
  createdAt: string;
  [key: string]: unknown;
}

export interface PersistenceResult {
  saved: boolean;
  templateId?: string;
  templateVersionId?: string;
  versionNumber?: number;
  reviewSessionId?: string;
  error?: string;
}

export interface ReviewActionRequest {
  reviewer: string;
  comment?: string;
  snapshotHash: string;
  snapshotVersion: number;
}

export interface ReviewActionResult {
  success: boolean;
  reviewStatus?: string;
  gateStatus?: string;
  canCompile?: boolean;
  approvalToken?: string;
  reviewEvents?: ReviewHistoryEvent[];
  decisionTrace?: DecisionTraceEntry[];
  artifacts?: unknown[];
  reviewSession?: ReviewSession;
  decision?: ApprovalDecision;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface ApprovalDecision {
  id: string;
  reviewSessionId: string;
  snapshotId: string;
  decision: string;
  reviewer: {
    id: string;
    name: string;
    email?: string;
    role?: string;
  };
  comment?: string;
  approvalToken?: string;
  createdAt: string;
}

export interface ReviewHistoryEvent {
  id: string;
  reviewSessionId: string;
  type: string;
  message: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface DecisionTraceEntry {
  id: string;
  executionId: string;
  agent: string;
  kind: string;
  summary: string;
  createdAt?: string;
  [key: string]: unknown;
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
