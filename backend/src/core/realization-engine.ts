import { randomUUID } from "node:crypto";
import type { BusinessContext } from "./business-context.model.js";
import type { CommunicationStrategy } from "./communication-strategy.model.js";
import {
  MessageRealizationChannel,
  MessageSectionType,
  type MessageSection,
  type MessageStructure,
  type MessageVariablePlaceholder,
} from "./message-structure.model.js";
import type { SemanticTemplateModel } from "./template.model.js";
import { CopywriterEngine } from "./copywriter-engine.js";
import {
  TemplateComponentBuilder,
  type TemplateComponentBuildResult,
} from "./template-component-builder.js";
import type { CopyBlockSet } from "./copy-block.model.js";
import { TemplateCategory } from "./enums.js";

export interface RealizationEngineInput {
  businessContext: BusinessContext;
  communicationStrategy: CommunicationStrategy;
  semanticTemplateModel: SemanticTemplateModel;
}

export interface MessageRealizationResult {
  messageStructure: MessageStructure;
  copyBlocks: CopyBlockSet;
  templateComponents: TemplateComponentBuildResult;
  warnings: string[];
}

export class RealizationEngine {
  private readonly copywriterEngine = new CopywriterEngine();
  private readonly componentBuilder = new TemplateComponentBuilder();

  realize(input: RealizationEngineInput): MessageRealizationResult {
    const messageStructure = this.createMessageStructure(input);
    const copyBlocks = this.copywriterEngine.createCopyBlocks({
      businessContext: input.businessContext,
      communicationStrategy: input.communicationStrategy,
      messageStructure,
    });
    const templateComponents = this.componentBuilder.build({
      messageStructure,
      copyBlocks,
      communicationStrategy: input.communicationStrategy,
    });

    return {
      messageStructure,
      copyBlocks,
      templateComponents,
      warnings: unique([
        ...messageStructure.warnings,
        ...copyBlocks.warnings,
        ...templateComponents.warnings,
      ]),
    };
  }

  createMessageStructure(input: RealizationEngineInput): MessageStructure {
    const sections: MessageSection[] = [];
    const warnings: string[] = [];
    const strategy = input.communicationStrategy;

    if (strategy.messageStructure.includeHeader && strategy.recommendedCategory !== TemplateCategory.Authentication) {
      sections.push(createSection(MessageSectionType.Opening, false, "Identify sender or frame message context.", 10));
    }

    sections.push(createSection(MessageSectionType.Context, true, "Open the conversation in the expected tone.", 20));
    sections.push(createSection(MessageSectionType.MainMessage, true, "Realize the central communication goal.", 30));

    if (strategy.messageStructure.includeButtons || strategy.cta.required) {
      sections.push(createSection(MessageSectionType.CallToAction, strategy.cta.required, "Guide the recipient to the next action.", 40));
      sections.push(createSection(MessageSectionType.ButtonSet, strategy.cta.required, "Represent the CTA as reusable button intent.", 50));
    }

    if (strategy.messageStructure.includeFooter && strategy.recommendedCategory !== TemplateCategory.Authentication) {
      sections.push(createSection(MessageSectionType.Footer, false, "Close with sender identity or concise disclaimer.", 60));
    }

    if (strategy.recommendedCategory === TemplateCategory.Authentication && strategy.messageStructure.includeHeader) {
      warnings.push("Header was omitted from realization because authentication messages should stay minimal.");
    }

    return {
      id: randomUUID(),
      channel: MessageRealizationChannel.WhatsAppTemplate,
      category: strategy.recommendedCategory,
      language: input.semanticTemplateModel.intent.language,
      sections,
      ctaType: strategy.cta.type,
      mediaType: strategy.media.type,
      variablePlaceholders: normalizePlaceholders(input.semanticTemplateModel.variableBindings),
      warnings,
    };
  }
}

function createSection(
  type: MessageSectionType,
  required: boolean,
  purpose: string,
  order: number
): MessageSection {
  return {
    id: `${type.toLowerCase()}_${order}`,
    type,
    required,
    purpose,
    order,
  };
}

function normalizePlaceholders(
  bindings: SemanticTemplateModel["variableBindings"]
): MessageVariablePlaceholder[] {
  return [...bindings]
    .sort((left, right) => left.variable.index - right.variable.index)
    .map((binding, index) => {
      const normalizedIndex = index + 1;
      return {
        index: normalizedIndex,
        name: binding.variable.name,
        token: `{{${normalizedIndex}}}`,
        example: normalizeExample(binding.variable.example, binding.variable.name),
        required: binding.variable.required,
        description: binding.variable.description,
      };
    });
}

function normalizeExample(example: string, name: string): string {
  const trimmed = example.trim();
  if (trimmed.length > 0 && !["exemplo", "[nome]", "[valor]", "valor"].includes(trimmed.toLowerCase())) {
    return trimmed;
  }

  if (name.includes("name")) return "Ana";
  if (name.includes("time") || name.includes("date")) return "10/05 as 14h";
  if (name.includes("reference") || name.includes("event")) return "pedido 1234";
  return "valor real";
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}
