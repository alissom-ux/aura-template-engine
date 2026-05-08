import { randomUUID } from "node:crypto";
import type { BusinessContext } from "./business-context.model.js";
import {
  CampaignIntentSource,
  type CampaignIntent,
  type CampaignIntentInput,
} from "./campaign-intent.model.js";
import {
  CommunicationObjective,
  CtaStrategyType,
  type CommunicationStrategy,
} from "./communication-strategy.model.js";
import {
  SemanticComponentRole,
  TemplateCategory,
  TemplateComponentType,
} from "./enums.js";
import type {
  SemanticComponent,
  SemanticConstraint,
  SemanticTemplateModel,
  SemanticVariableBinding,
} from "./template.model.js";
import {
  buildStrategyConstraints,
  detectKeywords,
  inferLifecycleStage,
  inferUrgency,
  recommendCategory,
  recommendConfidence,
  recommendCtaStrategy,
  recommendMediaStrategy,
  recommendMessageStructure,
  recommendObjective,
  recommendPersonalizationStrategy,
  recommendRiskStrategy,
} from "./recommendation-engine.js";

export interface StrategistEngineInput extends CampaignIntentInput {
  businessContext: BusinessContext;
}

export interface StrategistEngineResult {
  campaignIntent: CampaignIntent;
  communicationStrategy: CommunicationStrategy;
  semanticTemplateModel: SemanticTemplateModel;
}

export class StrategistEngine {
  createCampaignIntent(input: CampaignIntentInput): CampaignIntent {
    const detectedKeywords = detectKeywords(input.rawIntent);
    const lifecycleStage = inferLifecycleStage(detectedKeywords);

    return {
      id: randomUUID(),
      rawIntent: input.rawIntent,
      normalizedGoal: normalizeGoal(input.rawIntent),
      businessContextId: input.businessContextId,
      requestedCategory: input.requestedCategory,
      language: input.language ?? "pt_BR",
      source: input.source ?? CampaignIntentSource.UserPrompt,
      lifecycleStage,
      urgency: inferUrgency(input.rawIntent),
      desiredOutcome: inferDesiredOutcome(input.rawIntent),
      audienceHint: inferAudienceHint(input.rawIntent),
      explicitConstraints: inferExplicitConstraints(input.rawIntent),
      detectedKeywords,
    };
  }

  createCommunicationStrategy(
    campaignIntent: CampaignIntent,
    businessContext: BusinessContext
  ): CommunicationStrategy {
    const recommendedCategory = recommendCategory(campaignIntent);
    const objective = recommendObjective(campaignIntent);
    const cta = recommendCtaStrategy(campaignIntent, recommendedCategory);
    const media = recommendMediaStrategy(campaignIntent, recommendedCategory);
    const personalization = recommendPersonalizationStrategy(campaignIntent, businessContext);
    const risk = recommendRiskStrategy(campaignIntent, businessContext, recommendedCategory);
    const messageStructure = recommendMessageStructure(recommendedCategory, cta, media);
    const constraints = buildStrategyConstraints(businessContext, recommendedCategory);

    return {
      id: randomUUID(),
      campaignIntent,
      objective,
      recommendedCategory,
      cta,
      media,
      personalization,
      risk,
      messageStructure,
      constraints,
      rationale: buildRationale(objective, recommendedCategory, businessContext),
      confidence: recommendConfidence(risk),
    };
  }

  createSemanticTemplateModel(
    communicationStrategy: CommunicationStrategy,
    businessContext: BusinessContext
  ): SemanticTemplateModel {
    const semanticComponents = buildSemanticComponents(communicationStrategy);
    const variableBindings = buildVariableBindings(communicationStrategy);
    const constraints = buildSemanticConstraints(communicationStrategy);

    return {
      intent: {
        rawInput: communicationStrategy.campaignIntent.rawIntent,
        normalizedGoal: communicationStrategy.campaignIntent.normalizedGoal,
        category: communicationStrategy.recommendedCategory,
        language: communicationStrategy.campaignIntent.language,
        businessContextId: businessContext.id,
      },
      message: {
        objective: communicationStrategy.campaignIntent.desiredOutcome,
        audienceDescription:
          communicationStrategy.campaignIntent.audienceHint ??
          businessContext.audience.description,
        components: semanticComponents,
      },
      variableBindings,
      constraints,
    };
  }

  run(input: StrategistEngineInput): StrategistEngineResult {
    const campaignIntent = this.createCampaignIntent(input);
    const communicationStrategy = this.createCommunicationStrategy(
      campaignIntent,
      input.businessContext
    );
    const semanticTemplateModel = this.createSemanticTemplateModel(
      communicationStrategy,
      input.businessContext
    );

    return { campaignIntent, communicationStrategy, semanticTemplateModel };
  }
}

export function createCampaignIntent(input: CampaignIntentInput): CampaignIntent {
  return new StrategistEngine().createCampaignIntent(input);
}

export function createCommunicationStrategy(
  campaignIntent: CampaignIntent,
  businessContext: BusinessContext
): CommunicationStrategy {
  return new StrategistEngine().createCommunicationStrategy(campaignIntent, businessContext);
}

export function createSemanticTemplateModel(
  communicationStrategy: CommunicationStrategy,
  businessContext: BusinessContext
): SemanticTemplateModel {
  return new StrategistEngine().createSemanticTemplateModel(communicationStrategy, businessContext);
}

function buildSemanticComponents(strategy: CommunicationStrategy): SemanticComponent[] {
  const components: SemanticComponent[] = [];

  if (strategy.messageStructure.includeHeader) {
    components.push({
      id: "header_context",
      role: SemanticComponentRole.Context,
      componentType: TemplateComponentType.Header,
      required: false,
      notes: strategy.media.rationale,
    });
  }

  components.push({
    id: "body_main_message",
    role:
      strategy.recommendedCategory === TemplateCategory.Authentication
        ? SemanticComponentRole.SecurityCode
        : SemanticComponentRole.MainMessage,
    componentType: TemplateComponentType.Body,
    required: true,
    notes: strategy.campaignIntent.normalizedGoal,
  });

  if (strategy.messageStructure.includeFooter) {
    components.push({
      id: "footer_disclaimer",
      role: SemanticComponentRole.Disclaimer,
      componentType: TemplateComponentType.Footer,
      required: false,
      notes: "Keep footer concise and aligned with business constraints.",
    });
  }

  if (strategy.messageStructure.includeButtons) {
    components.push({
      id: "buttons_cta",
      role:
        strategy.cta.type === CtaStrategyType.QuickReply
          ? SemanticComponentRole.UserChoice
          : SemanticComponentRole.CallToAction,
      componentType: TemplateComponentType.Buttons,
      required: strategy.cta.required,
      notes: strategy.cta.rationale,
    });
  }

  return components;
}

function buildVariableBindings(strategy: CommunicationStrategy): SemanticVariableBinding[] {
  return strategy.personalization.suggestedVariables.map((variable, index) => ({
    variable: {
      index: index + 1,
      name: variable.name,
      description: variable.description,
      example: variable.example,
      required: variable.required,
      source: "system",
    },
    appearsIn: [TemplateComponentType.Body],
    semanticPurpose: variable.description,
  }));
}

function buildSemanticConstraints(strategy: CommunicationStrategy): SemanticConstraint[] {
  return strategy.constraints.map((constraint) => ({
    id: constraint.id,
    source:
      constraint.source === "business_context"
        ? "business_policy"
        : constraint.source === "channel_policy"
          ? "system"
          : "system",
    description: constraint.description,
    severity: constraint.severity,
  }));
}

function buildRationale(
  objective: CommunicationObjective,
  category: CommunicationStrategy["recommendedCategory"],
  businessContext: BusinessContext
): string[] {
  return [
    `Objective selected: ${objective}.`,
    `Recommended category: ${category}.`,
    `Business segment considered: ${businessContext.segment}.`,
  ];
}

function inferDesiredOutcome(rawIntent: string): string {
  const normalized = normalizeGoal(rawIntent);
  return normalized.length > 0 ? normalized : "Communicate a relevant business update.";
}

function inferAudienceHint(rawIntent: string): string | undefined {
  const match = rawIntent.match(/\b(?:para|to)\s+([^,.]+)/i);
  return match?.[1]?.trim();
}

function inferExplicitConstraints(rawIntent: string): string[] {
  const constraints: string[] = [];
  const normalized = rawIntent.toLowerCase();

  if (normalized.includes("sem promocao")) {
    constraints.push("Avoid promotional content.");
  }
  if (normalized.includes("sem emoji") || normalized.includes("sem emojis")) {
    constraints.push("Avoid emojis.");
  }
  if (normalized.includes("formal")) {
    constraints.push("Use a formal tone.");
  }

  return constraints;
}

function normalizeGoal(rawIntent: string): string {
  return rawIntent.trim().replace(/\s+/g, " ");
}
