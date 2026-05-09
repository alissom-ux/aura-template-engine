import type {
  BusinessContext,
  CampaignIntent,
  CommunicationStrategy,
  PipelineRequest,
  SemanticTemplateModel,
  StrategyPlan,
  TemplateCategory,
  TemplateVariable,
} from "../types/index.js";
import { StrategistEngine, type StrategistEngineResult } from "../core/strategist-engine.js";
import { OpenAiJsonClient, PipelineLogger, PromptRegistry } from "../ai/index.js";

interface OperationalStrategistInput {
  rawIntent: string;
  businessContextId: string;
  requestedCategory?: TemplateCategory;
  language?: string;
  businessContext: BusinessContext;
}

export interface OperationalStrategistResult extends StrategistEngineResult {
  strategicGuidance: {
    objective: string;
    idealTone: string;
    cta: string;
    guidance: string[];
    keyMessages: string[];
    aiWarnings: string[];
  };
}

interface StrategistAiOutput {
  normalizedGoal?: string;
  recommendedCategory?: TemplateCategory;
  objective?: string;
  idealTone?: string;
  ctaLabel?: string;
  ctaRationale?: string;
  guidance?: string[];
  keyMessages?: string[];
  variables?: Array<{
    name: string;
    description: string;
    example: string;
    required?: boolean;
  }>;
  riskReasons?: string[];
  mitigationHints?: string[];
}

export class StrategistAgent {
  private readonly engine = new StrategistEngine();
  private readonly ai = new OpenAiJsonClient();
  private readonly logger = new PipelineLogger();

  async run(request: PipelineRequest): Promise<StrategyPlan> {
    const businessContext = createLegacyBusinessContext(request.businessContextId);
    const result = await this.runOperational({
      rawIntent: request.intent,
      businessContextId: request.businessContextId,
      requestedCategory: request.category,
      language: request.language,
      businessContext,
    });

    return toStrategyPlan(result);
  }

  async runOperational(input: OperationalStrategistInput): Promise<OperationalStrategistResult> {
    const deterministic = this.engine.run(input);
    const aiResult = await this.ai.completeJson<StrategistAiOutput>({
      agent: "StrategistAgent",
      systemPrompt: PromptRegistry.strategist,
      fallbackLabel: "StrategistEngine",
      userPayload: {
        intent: input.rawIntent,
        requestedCategory: input.requestedCategory,
        language: input.language ?? "pt_BR",
        businessContext: input.businessContext,
        deterministicBaseline: summarizeDeterministicStrategy(deterministic),
        requiredJsonShape: {
          normalizedGoal: "string",
          recommendedCategory: "MARKETING | UTILITY | AUTHENTICATION",
          objective: "string",
          idealTone: "string",
          ctaLabel: "string",
          ctaRationale: "string",
          guidance: ["string"],
          keyMessages: ["string"],
          variables: [{ name: "string", description: "string", example: "string", required: true }],
          riskReasons: ["string"],
          mitigationHints: ["string"],
        },
      },
    });

    const enhanced = aiResult.output
      ? applyAiStrategy(deterministic, aiResult.output)
      : deterministic;

    const guidance = {
      objective: aiResult.output?.objective ?? enhanced.campaignIntent.desiredOutcome,
      idealTone: aiResult.output?.idealTone ?? input.businessContext.tone.primary,
      cta: aiResult.output?.ctaLabel ?? enhanced.communicationStrategy.cta.labelHint ?? "Continuar",
      guidance: nonEmpty(aiResult.output?.guidance, enhanced.communicationStrategy.rationale),
      keyMessages: nonEmpty(aiResult.output?.keyMessages, [enhanced.campaignIntent.normalizedGoal]),
      aiWarnings: aiResult.warnings,
    };

    this.logger.info({
      agent: "StrategistAgent",
      stage: "strategy.completed",
      detail: {
        category: enhanced.communicationStrategy.recommendedCategory,
        objective: enhanced.communicationStrategy.objective,
        aiSkipped: aiResult.skipped,
        warnings: aiResult.warnings,
      },
    });

    return {
      ...enhanced,
      strategicGuidance: guidance,
    };
  }
}

function applyAiStrategy(
  deterministic: StrategistEngineResult,
  ai: StrategistAiOutput
): StrategistEngineResult {
  const campaignIntent: CampaignIntent = {
    ...deterministic.campaignIntent,
    normalizedGoal: ai.normalizedGoal?.trim() || deterministic.campaignIntent.normalizedGoal,
    desiredOutcome: ai.objective?.trim() || deterministic.campaignIntent.desiredOutcome,
  };

  const communicationStrategy: CommunicationStrategy = {
    ...deterministic.communicationStrategy,
    campaignIntent,
    recommendedCategory: ai.recommendedCategory ?? deterministic.communicationStrategy.recommendedCategory,
    cta: {
      ...deterministic.communicationStrategy.cta,
      labelHint: ai.ctaLabel?.slice(0, 25) ?? deterministic.communicationStrategy.cta.labelHint,
      rationale: ai.ctaRationale ?? deterministic.communicationStrategy.cta.rationale,
    },
    personalization: {
      ...deterministic.communicationStrategy.personalization,
      suggestedVariables: ai.variables?.length
        ? ai.variables.slice(0, 5).map((variable) => ({
            name: normalizeVariableName(variable.name),
            description: variable.description,
            example: variable.example,
            required: variable.required ?? true,
          }))
        : deterministic.communicationStrategy.personalization.suggestedVariables,
    },
    risk: {
      ...deterministic.communicationStrategy.risk,
      reasons: nonEmpty(ai.riskReasons, deterministic.communicationStrategy.risk.reasons),
      mitigationHints: nonEmpty(ai.mitigationHints, deterministic.communicationStrategy.risk.mitigationHints),
    },
    rationale: nonEmpty(ai.guidance, deterministic.communicationStrategy.rationale),
  };

  const semanticTemplateModel: SemanticTemplateModel = {
    ...deterministic.semanticTemplateModel,
    intent: {
      ...deterministic.semanticTemplateModel.intent,
      normalizedGoal: campaignIntent.normalizedGoal,
      category: communicationStrategy.recommendedCategory,
    },
    message: {
      ...deterministic.semanticTemplateModel.message,
      objective: campaignIntent.desiredOutcome,
    },
    variableBindings: communicationStrategy.personalization.suggestedVariables.map((variable, index) => ({
      variable: {
        index: index + 1,
        name: variable.name,
        description: variable.description,
        example: variable.example,
        required: variable.required,
        source: "agent",
      },
      appearsIn: ["BODY"],
      semanticPurpose: variable.description,
    })),
  };

  return { campaignIntent, communicationStrategy, semanticTemplateModel };
}

function toStrategyPlan(result: OperationalStrategistResult): StrategyPlan {
  return {
    campaignIntent: result.campaignIntent,
    communicationStrategy: result.communicationStrategy,
    templateCategory: result.communicationStrategy.recommendedCategory,
    recommendedComponents: result.semanticTemplateModel.message.components.map((component) => component.componentType),
    messagingGoal: result.campaignIntent.desiredOutcome,
    keyMessages: result.strategicGuidance.keyMessages,
    suggestedVariables: result.semanticTemplateModel.variableBindings.map((binding) => binding.variable as TemplateVariable),
    callToAction: result.strategicGuidance.cta,
    semanticModel: result.semanticTemplateModel,
    warnings: result.strategicGuidance.aiWarnings,
  };
}

function summarizeDeterministicStrategy(result: StrategistEngineResult) {
  return {
    normalizedGoal: result.campaignIntent.normalizedGoal,
    category: result.communicationStrategy.recommendedCategory,
    objective: result.communicationStrategy.objective,
    cta: result.communicationStrategy.cta,
    variables: result.communicationStrategy.personalization.suggestedVariables,
    risk: result.communicationStrategy.risk,
  };
}

function createLegacyBusinessContext(id: string): BusinessContext {
  return {
    id,
    name: "Legacy Business Context",
    segment: "general",
    description: "Legacy /api pipeline context.",
    tone: { primary: "empathetic", avoid: [], guidelines: "clear and compliant" },
    audience: { description: "General audience", painPoints: [], expectations: ["clear information"] },
    policies: [],
    examples: [],
    createdAt: new Date().toISOString(),
  };
}

function normalizeVariableName(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "variable";
}

function nonEmpty<T>(value: T[] | undefined, fallback: T[]): T[] {
  return value && value.length > 0 ? value : fallback;
}
