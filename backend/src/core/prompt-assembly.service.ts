import { randomUUID } from "node:crypto";
import {
  AgentExecutionMode,
  AgentOutputFormat,
  type AgentContext,
  type AgentPromptContext,
  type AgentRoleDefinition,
  type PromptContextBlock,
} from "./agent-context.model.js";
import {
  MemoryKind,
  MemoryScope,
  type AgentMemoryEntry,
  type CreateAgentMemoryEntryInput,
} from "./agent-memory.model.js";
import {
  DecisionConfidence,
  type CreateDecisionTraceEntryInput,
  type DecisionTraceEntry,
} from "./decision-trace.model.js";
import {
  ExecutionArtifactType,
  ExecutionStatus,
  type AgentExecutionContext,
  type CreateExecutionContextInput,
  type ExecutionArtifact,
  type ExecutionError,
} from "./execution-context.model.js";
import {
  AgentType,
  type AgentType as AgentTypeValue,
} from "./enums.js";

export interface PromptAssemblyInput {
  executionContext: AgentExecutionContext;
  agent: AgentTypeValue;
  role: AgentRoleDefinition;
  payload: unknown;
  expectedOutput: string;
  requiredFields?: string[];
  additionalBlocks?: PromptContextBlock[];
}

export interface AssembledPrompt {
  executionId: string;
  agent: AgentTypeValue;
  promptContext: AgentPromptContext;
  messages: PromptMessage[];
}

export interface PromptMessage {
  role: "system" | "user";
  content: string;
}

export class PromptAssemblyService {
  createExecutionContext(input: CreateExecutionContextInput): AgentExecutionContext {
    const now = new Date().toISOString();

    return {
      id: randomUUID(),
      request: input.request,
      status: ExecutionStatus.Created,
      businessContext: input.businessContext,
      agentContexts: {},
      artifacts: [],
      decisions: [],
      memory: [],
      errors: [],
      createdAt: now,
      updatedAt: now,
    };
  }

  createAgentContext(input: PromptAssemblyInput): AgentContext {
    const prompt = this.buildPromptContext(input);

    return {
      executionId: input.executionContext.id,
      agent: input.agent,
      mode: AgentExecutionMode.Deterministic,
      role: input.role,
      input: {
        payload: input.payload,
        expectedOutput: input.expectedOutput,
        requiredFields: input.requiredFields ?? [],
      },
      shared: {
        businessContext: input.executionContext.businessContext,
        campaignIntent: input.executionContext.campaignIntent,
        communicationStrategy: input.executionContext.communicationStrategy,
        semanticTemplateModel: input.executionContext.semanticTemplateModel,
        artifacts: mapArtifacts(input.executionContext.artifacts),
      },
      memory: selectRelevantMemory(input.executionContext.memory, input.agent),
      decisions: input.executionContext.decisions,
      prompt,
    };
  }

  assemblePrompt(input: PromptAssemblyInput): AssembledPrompt {
    const promptContext = this.buildPromptContext(input);
    const userContent = [
      ...promptContext.contextBlocks
        .sort((a, b) => a.priority - b.priority)
        .map((block) => formatBlock(block)),
      formatBlock({
        id: "output_contract",
        title: "Output Contract",
        priority: 100,
        content: promptContext.outputContract,
      }),
    ].join("\n\n");

    return {
      executionId: input.executionContext.id,
      agent: input.agent,
      promptContext,
      messages: [
        { role: "system", content: promptContext.system },
        {
          role: "user",
          content: [
            "Instructions:",
            ...promptContext.instructions.map((instruction) => `- ${instruction}`),
            "",
            userContent,
          ].join("\n"),
        },
      ],
    };
  }

  buildPromptContext(input: PromptAssemblyInput): AgentPromptContext {
    return {
      system: buildSystemPrompt(input.role),
      instructions: buildInstructions(input.role),
      contextBlocks: [
        ...buildSharedContextBlocks(input.executionContext),
        buildPayloadBlock(input.payload),
        ...(input.additionalBlocks ?? []),
      ],
      outputContract: buildOutputContract(input.role, input.expectedOutput, input.requiredFields ?? []),
    };
  }

  addArtifact(
    context: AgentExecutionContext,
    artifact: Omit<ExecutionArtifact, "id" | "createdAt">
  ): AgentExecutionContext {
    return {
      ...context,
      artifacts: [
        ...context.artifacts,
        {
          ...artifact,
          id: randomUUID(),
          createdAt: new Date().toISOString(),
        },
      ],
      updatedAt: new Date().toISOString(),
    };
  }

  addDecision(
    context: AgentExecutionContext,
    input: CreateDecisionTraceEntryInput
  ): AgentExecutionContext {
    const entry: DecisionTraceEntry = {
      id: randomUUID(),
      executionId: input.executionId,
      agent: input.agent,
      kind: input.kind,
      summary: input.summary,
      inputs: input.inputs ?? [],
      output: input.output,
      rationale: input.rationale ?? [],
      confidence: input.confidence ?? DecisionConfidence.Medium,
      createdAt: new Date().toISOString(),
    };

    return {
      ...context,
      decisions: [...context.decisions, entry],
      updatedAt: new Date().toISOString(),
    };
  }

  addMemory(
    context: AgentExecutionContext,
    input: CreateAgentMemoryEntryInput
  ): AgentExecutionContext {
    const entry: AgentMemoryEntry = {
      id: randomUUID(),
      executionId: input.executionId,
      businessContextId: input.businessContextId,
      agent: input.agent,
      scope: input.scope,
      kind: input.kind,
      key: input.key,
      value: input.value,
      summary: input.summary,
      tags: input.tags ?? [],
      createdAt: new Date().toISOString(),
      expiresAt: input.expiresAt,
    };

    return {
      ...context,
      memory: [...context.memory, entry],
      updatedAt: new Date().toISOString(),
    };
  }

  addError(
    context: AgentExecutionContext,
    error: Omit<ExecutionError, "id" | "createdAt">
  ): AgentExecutionContext {
    return {
      ...context,
      status: ExecutionStatus.Failed,
      errors: [
        ...context.errors,
        {
          ...error,
          id: randomUUID(),
          createdAt: new Date().toISOString(),
        },
      ],
      updatedAt: new Date().toISOString(),
    };
  }
}

export function createDefaultAgentRole(agent: AgentTypeValue): AgentRoleDefinition {
  const commonForbiddenActions = [
    "Do not call external AI providers.",
    "Do not submit templates to Meta.",
    "Do not mutate unrelated execution artifacts.",
  ];

  const roles: Record<AgentTypeValue, AgentRoleDefinition> = {
    [AgentType.Strategist]: {
      name: "Strategist Agent",
      responsibility: "Transform campaign context into communication strategy and semantic direction.",
      allowedActions: ["Read business context.", "Create strategic recommendations.", "Record decision traces."],
      forbiddenActions: commonForbiddenActions,
      outputFormat: AgentOutputFormat.Json,
    },
    [AgentType.Copywriter]: {
      name: "Copywriter Agent",
      responsibility: "Draft channel-agnostic message components from strategy.",
      allowedActions: ["Use semantic strategy.", "Create copy alternatives.", "Preserve variable contracts."],
      forbiddenActions: commonForbiddenActions,
      outputFormat: AgentOutputFormat.Json,
    },
    [AgentType.PolicyReviewer]: {
      name: "Policy Reviewer Agent",
      responsibility: "Evaluate content against business and channel constraints.",
      allowedActions: ["Read constraints.", "Return violations and suggestions.", "Record policy decisions."],
      forbiddenActions: commonForbiddenActions,
      outputFormat: AgentOutputFormat.Json,
    },
    [AgentType.Compiler]: {
      name: "Compiler Agent",
      responsibility: "Prepare internal semantic output for a channel compiler boundary.",
      allowedActions: ["Validate structure.", "Return compilation readiness.", "Keep Meta-specific mapping separated."],
      forbiddenActions: commonForbiddenActions,
      outputFormat: AgentOutputFormat.Json,
    },
    [AgentType.Auditor]: {
      name: "Auditor Agent",
      responsibility: "Score final readiness and explain residual risks.",
      allowedActions: ["Review artifacts.", "Score checks.", "Recommend submit, review, or reject."],
      forbiddenActions: commonForbiddenActions,
      outputFormat: AgentOutputFormat.Json,
    },
  };

  return roles[agent];
}

function buildSystemPrompt(role: AgentRoleDefinition): string {
  return [
    `You are ${role.name}.`,
    role.responsibility,
    "Separate reasoning artifacts from final output.",
    "Return only the requested output contract.",
  ].join("\n");
}

function buildInstructions(role: AgentRoleDefinition): string[] {
  return [
    ...role.allowedActions.map((action) => `Allowed: ${action}`),
    ...role.forbiddenActions.map((action) => `Forbidden: ${action}`),
    `Output format: ${role.outputFormat}.`,
  ];
}

function buildSharedContextBlocks(context: AgentExecutionContext): PromptContextBlock[] {
  return [
    {
      id: "pipeline_request",
      title: "Pipeline Request",
      priority: 10,
      content: serialize(context.request),
    },
    context.businessContext
      ? {
          id: "business_context",
          title: "Business Context",
          priority: 20,
          content: serialize(context.businessContext),
        }
      : undefined,
    context.campaignIntent
      ? {
          id: "campaign_intent",
          title: "Campaign Intent",
          priority: 30,
          content: serialize(context.campaignIntent),
        }
      : undefined,
    context.communicationStrategy
      ? {
          id: "communication_strategy",
          title: "Communication Strategy",
          priority: 40,
          content: serialize(context.communicationStrategy),
        }
      : undefined,
    context.semanticTemplateModel
      ? {
          id: "semantic_template_model",
          title: "Semantic Template Model",
          priority: 50,
          content: serialize(context.semanticTemplateModel),
        }
      : undefined,
    context.decisions.length > 0
      ? {
          id: "decision_trace",
          title: "Decision Trace",
          priority: 60,
          content: serialize(context.decisions),
        }
      : undefined,
    context.memory.length > 0
      ? {
          id: "agent_memory",
          title: "Agent Memory",
          priority: 70,
          content: serialize(context.memory),
        }
      : undefined,
  ].filter((block): block is PromptContextBlock => Boolean(block));
}

function buildPayloadBlock(payload: unknown): PromptContextBlock {
  return {
    id: "agent_payload",
    title: "Agent Payload",
    priority: 80,
    content: serialize(payload),
  };
}

function buildOutputContract(
  role: AgentRoleDefinition,
  expectedOutput: string,
  requiredFields: string[]
): string {
  return serialize({
    format: role.outputFormat,
    expectedOutput,
    requiredFields,
    reasoningPolicy: "Do not include private reasoning. Include concise rationale fields only when requested.",
  });
}

function formatBlock(block: PromptContextBlock): string {
  return [`## ${block.title}`, block.content].join("\n");
}

function mapArtifacts(artifacts: ExecutionArtifact[]): Record<string, unknown> {
  return Object.fromEntries(artifacts.map((artifact) => [artifact.label, artifact.value]));
}

function selectRelevantMemory(
  memory: AgentMemoryEntry[],
  agent: AgentTypeValue
): AgentMemoryEntry[] {
  return memory.filter(
    (entry) =>
      entry.agent === agent ||
      entry.scope === MemoryScope.Execution ||
      entry.kind === MemoryKind.Constraint
  );
}

function serialize(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export const AgentExecutionArtifacts = ExecutionArtifactType;
