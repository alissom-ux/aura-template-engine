import type { TemplateCategory } from "./enums.js";
import type { BusinessContext } from "./business-context.model.js";
import type { CampaignIntent } from "./campaign-intent.model.js";
import type { CommunicationStrategy } from "./communication-strategy.model.js";
import type { AgentExecutionContext } from "./execution-context.model.js";
import type { AuditReport } from "./audit-report.model.js";
import type {
  SemanticTemplateModel,
  TemplateComponent,
  TemplateVariable,
  WhatsAppTemplate,
} from "./template.model.js";

export interface PipelineRequest {
  intent: string;
  businessContextId: string;
  category?: TemplateCategory;
  language?: string;
}

export interface PipelineResult {
  templateId: string;
  template: WhatsAppTemplate;
  auditReport: AuditReport;
  success: boolean;
  failedAt?: AgentTypeValue;
  error?: string;
}

export type AgentTypeValue =
  | "strategist"
  | "copywriter"
  | "policy_reviewer"
  | "compiler"
  | "auditor";

export interface AgentRunContext {
  executionContext?: AgentExecutionContext;
  businessContext: BusinessContext;
  campaignIntent?: CampaignIntent;
  communicationStrategy?: CommunicationStrategy;
  semanticModel?: SemanticTemplateModel;
}

export interface StrategyPlan {
  campaignIntent?: CampaignIntent;
  communicationStrategy?: CommunicationStrategy;
  templateCategory: TemplateCategory;
  recommendedComponents: TemplateComponent["type"][];
  messagingGoal: string;
  keyMessages: string[];
  suggestedVariables: TemplateVariable[];
  callToAction?: string;
  semanticModel?: SemanticTemplateModel;
  warnings: string[];
}

export interface CopywriterOutput {
  components: TemplateComponent[];
  variablesUsed: TemplateVariable[];
  semanticModel?: SemanticTemplateModel;
  copyNotes: string;
  alternatives?: TemplateComponent[][];
}

export interface AgentPolicyViolation {
  severity: "block" | "warn";
  rule: string;
  affectedText: string;
  suggestion: string;
}

export interface PolicyReviewResult {
  approved: boolean;
  violations: AgentPolicyViolation[];
  warnings: AgentPolicyViolation[];
  suggestions: string[];
}

export interface CompiledTemplate {
  name: string;
  category: TemplateCategory;
  language: string;
  components: TemplateComponent[];
  submissionReady: boolean;
  compilationNotes: string[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
