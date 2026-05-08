import type { AgentType } from "./enums.js";
import type { PipelineRequest } from "./agent-contracts.model.js";
import type { BusinessContext } from "./business-context.model.js";
import type { CampaignIntent } from "./campaign-intent.model.js";
import type { CommunicationStrategy } from "./communication-strategy.model.js";
import type { SemanticTemplateModel } from "./template.model.js";
import type { AgentContext } from "./agent-context.model.js";
import type { AgentMemoryEntry } from "./agent-memory.model.js";
import type { DecisionTraceEntry } from "./decision-trace.model.js";

export const ExecutionStatus = {
  Created: "CREATED",
  Running: "RUNNING",
  WaitingForAgent: "WAITING_FOR_AGENT",
  Completed: "COMPLETED",
  Failed: "FAILED",
  Cancelled: "CANCELLED",
} as const;

export type ExecutionStatus =
  (typeof ExecutionStatus)[keyof typeof ExecutionStatus];

export const ExecutionArtifactType = {
  CampaignIntent: "CAMPAIGN_INTENT",
  CommunicationStrategy: "COMMUNICATION_STRATEGY",
  SemanticTemplateModel: "SEMANTIC_TEMPLATE_MODEL",
  AgentOutput: "AGENT_OUTPUT",
  ValidationResult: "VALIDATION_RESULT",
  Prompt: "PROMPT",
} as const;

export type ExecutionArtifactType =
  (typeof ExecutionArtifactType)[keyof typeof ExecutionArtifactType];

export interface AgentExecutionContext {
  id: string;
  request: PipelineRequest;
  status: ExecutionStatus;
  businessContext?: BusinessContext;
  campaignIntent?: CampaignIntent;
  communicationStrategy?: CommunicationStrategy;
  semanticTemplateModel?: SemanticTemplateModel;
  activeAgent?: AgentType;
  agentContexts: Partial<Record<AgentType, AgentContext>>;
  artifacts: ExecutionArtifact[];
  decisions: DecisionTraceEntry[];
  memory: AgentMemoryEntry[];
  errors: ExecutionError[];
  createdAt: string;
  updatedAt: string;
}

export interface ExecutionArtifact {
  id: string;
  type: ExecutionArtifactType;
  owner: AgentType | "system";
  label: string;
  value: unknown;
  createdAt: string;
}

export interface ExecutionError {
  id: string;
  agent?: AgentType;
  code: string;
  message: string;
  recoverable: boolean;
  createdAt: string;
}

export interface CreateExecutionContextInput {
  request: PipelineRequest;
  businessContext?: BusinessContext;
}
