import type {
  AgentExecutionContext,
  AuditReport,
  BusinessContext,
  CampaignIntent,
  CommunicationStrategy,
  CopyBlockSet,
  DecisionTraceEntry,
  HumanReviewState,
  MessageStructure,
  PolicyReview,
  ReviewSession,
  ReviewSnapshot,
  SemanticTemplateModel,
  TemplateComponent,
  TemplateCategory,
  ValidationResult,
} from "../core/index.js";

export interface TemplateDraftPipelineRequest {
  userPrompt: string;
  businessContext: TemplateDraftBusinessContextInput;
  defaults?: TemplateDraftDefaults;
}

export interface TemplateDraftBusinessContextInput {
  companyName: string;
  industry: string;
  brandVoice: string;
  description?: string;
  audience?: string;
  complianceNotes?: string;
}

export interface TemplateDraftDefaults {
  category?: TemplateCategory;
  language?: string;
}

export interface TemplateDraftPipelineResult {
  success: boolean;
  executionId: string;
  campaignIntent?: CampaignIntent;
  communicationStrategy?: CommunicationStrategy;
  semanticTemplate?: SemanticTemplateModel;
  messageStructure?: MessageStructure;
  copyBlocks?: CopyBlockSet;
  templateComponents?: TemplateComponent[];
  policyReview?: PolicyReview;
  validation?: ValidationResult;
  auditReport?: AuditReport;
  humanReview?: HumanReviewState;
  reviewSession?: ReviewSession;
  reviewSnapshot?: ReviewSnapshot;
  decisionTrace: DecisionTraceEntry[];
  warnings: string[];
  errors?: PipelineError[];
  nextStep: "review_template" | "fix_validation_errors" | "fix_policy_violations" | "pipeline_failed";
}

export interface PipelineError {
  code: string;
  message: string;
  details?: unknown;
}

export interface PipelineBusinessContextResolution {
  businessContext: BusinessContext;
  warnings: string[];
}

export interface TemplateDraftPipelineState {
  executionContext: AgentExecutionContext;
  warnings: string[];
}
