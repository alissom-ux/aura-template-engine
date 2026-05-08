import type { CommunicationStrategy } from "./communication-strategy.model.js";
import { CtaStrategyType } from "./communication-strategy.model.js";
import { CopyBlockKind, type CopyBlockSet } from "./copy-block.model.js";
import { ButtonType, HeaderFormat, TemplateCategory } from "./enums.js";
import type { MessageStructure } from "./message-structure.model.js";
import type { TemplateButton, TemplateComponent } from "./template.model.js";

export interface TemplateComponentBuilderInput {
  messageStructure: MessageStructure;
  copyBlocks: CopyBlockSet;
  communicationStrategy: CommunicationStrategy;
}

export interface TemplateComponentBuildResult {
  components: TemplateComponent[];
  warnings: string[];
}

export class TemplateComponentBuilder {
  build(input: TemplateComponentBuilderInput): TemplateComponentBuildResult {
    const warnings: string[] = [...input.copyBlocks.warnings];
    const components: TemplateComponent[] = [];
    const header = input.copyBlocks.blocks.find((block) => block.kind === CopyBlockKind.Header);
    const footer = input.copyBlocks.blocks.find((block) => block.kind === CopyBlockKind.Footer);
    const bodyBlocks = input.copyBlocks.blocks.filter((block) =>
      block.kind === CopyBlockKind.BodyOpening ||
      block.kind === CopyBlockKind.BodyContext ||
      block.kind === CopyBlockKind.BodyMain ||
      block.kind === CopyBlockKind.BodyCta
    );
    const buttonBlocks = input.copyBlocks.blocks.filter((block) => block.kind === CopyBlockKind.Button);

    if (header) {
      components.push({
        type: "HEADER",
        format: HeaderFormat.Text,
        text: truncate(header.text, 60),
      });
    }

    components.push({
      type: "BODY",
      text: truncate(normalizeVariableTokens(
        bodyBlocks.map((block) => block.text).filter(Boolean).join(" "),
        input.messageStructure.variablePlaceholders.map((variable) => variable.token)
      ), 1024),
      example: input.messageStructure.variablePlaceholders.length > 0
        ? { body_text: [input.messageStructure.variablePlaceholders.map((variable) => variable.example)] }
        : undefined,
    });

    if (footer) {
      components.push({
        type: "FOOTER",
        text: truncate(footer.text, 60),
      });
    }

    const buttons = buildButtons(input.communicationStrategy, buttonBlocks.map((block) => block.text));
    if (buttons.length > 0) {
      components.push({
        type: "BUTTONS",
        buttons,
      });
    }

    if (input.communicationStrategy.recommendedCategory === TemplateCategory.Authentication && header) {
      warnings.push("Authentication templates should avoid unnecessary headers.");
    }

    return { components, warnings: unique(warnings) };
  }
}

function buildButtons(strategy: CommunicationStrategy, labels: string[]): TemplateButton[] {
  const label = truncate(labels[0] ?? strategy.cta.labelHint ?? "Continuar", 25);

  if (strategy.cta.type === CtaStrategyType.QuickReply) {
    return [{ type: ButtonType.QuickReply, text: label }];
  }
  if (strategy.cta.type === CtaStrategyType.VisitUrl) {
    return [{ type: ButtonType.Url, text: label, url: strategy.cta.targetHint ?? "https://example.com" }];
  }
  if (strategy.cta.type === CtaStrategyType.CallPhone) {
    return [{ type: ButtonType.PhoneNumber, text: label, phone_number: strategy.cta.targetHint ?? "+5511999999999" }];
  }
  if (strategy.cta.type === CtaStrategyType.CopyCode) {
    return [{ type: ButtonType.CopyCode, example: "123456" }];
  }
  return [];
}

function truncate(value: string, maxLength: number): string {
  return value.length <= maxLength ? value : value.slice(0, maxLength);
}

function normalizeVariableTokens(text: string, expectedTokens: string[]): string {
  const tokenMap = new Map<string, string>();
  const foundTokens = [...new Set([...text.matchAll(/\{\{(\d+)\}\}/g)].map((match) => match[0]))];

  for (const [index, token] of foundTokens.entries()) {
    tokenMap.set(token, `{{${index + 1}}}`);
  }

  let normalized = text;
  for (const [from, to] of tokenMap.entries()) {
    normalized = normalized.replaceAll(from, to);
  }

  const normalizedTokens = new Set([...normalized.matchAll(/\{\{(\d+)\}\}/g)].map((match) => match[0]));
  for (const token of expectedTokens) {
    if (!normalizedTokens.has(token)) {
      normalized = `${token} ${normalized}`;
      normalizedTokens.add(token);
    }
  }

  return normalized.trim();
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}
