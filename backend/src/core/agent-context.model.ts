import type { AgentType } from "./enums.js";
import type { BusinessContext } from "./business-context.model.js";
import type { CampaignIntent } from "./campaign-intent.model.js";
import type { CommunicationStrategy } from "./communication-strategy.model.js";
import type { SemanticTemplateModel } from "./template.model.js";
import type { AgentMemoryEntry } from "./agent-memory.model.js";
import type { DecisionTraceEntry } from "./decision-trace.model.js";

export const AgentExecutionMode = {
  Deterministic: "DETERMINISTIC",
  Assisted: "ASSISTED",
  Autonomous: "AUTONOMOUS",
} as const;

export type AgentExecutionMode =
  (typeof AgentExecutionMode)[keyof typeof AgentExecutionMode];

export const AgentOutputFormat = {
  Json: "JSON",
  Text: "TEXT",
  Markdown: "MARKDOWN",
} as const;

export type AgentOutputFormat =
  (typeof AgentOutputFormat)[keyof typeof AgentOutputFormat];

export interface AgentContext {
  executionId: string;
  agent: AgentType;
  mode: AgentExecutionMode;
  role: AgentRoleDefinition;
  input: AgentInputContext;
  shared: AgentSharedContext;
  memory: AgentMemoryEntry[];
  decisions: DecisionTraceEntry[];
  prompt?: AgentPromptContext;
}

export interface AgentRoleDefinition {
  name: string;
  responsibility: string;
  allowedActions: string[];
  forbiddenActions: string[];
  outputFormat: AgentOutputFormat;
}

export interface AgentInputContext {
  payload: unknown;
  expectedOutput: string;
  requiredFields: string[];
}

export interface AgentSharedContext {
  businessContext?: BusinessContext;
  campaignIntent?: CampaignIntent;
  communicationStrategy?: CommunicationStrategy;
  semanticTemplateModel?: SemanticTemplateModel;
  artifacts: Record<string, unknown>;
}

export interface AgentPromptContext {
  system: string;
  instructions: string[];
  contextBlocks: PromptContextBlock[];
  outputContract: string;
}

export interface PromptContextBlock {
  id: string;
  title: string;
  priority: number;
  content: string;
}
