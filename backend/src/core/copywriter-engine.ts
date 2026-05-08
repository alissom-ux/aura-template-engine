import { randomUUID } from "node:crypto";
import type { BusinessContext } from "./business-context.model.js";
import {
  CommunicationObjective,
  CtaStrategyType,
  type CommunicationStrategy,
} from "./communication-strategy.model.js";
import {
  CopyBlockKind,
  CopyBlockVariantRole,
  type CopyBlock,
  type CopyBlockSet,
} from "./copy-block.model.js";
import {
  MessageSectionType,
  type MessageStructure,
  type MessageVariablePlaceholder,
} from "./message-structure.model.js";
import { TemplateCategory } from "./enums.js";

export interface CopywriterEngineInput {
  businessContext: BusinessContext;
  communicationStrategy: CommunicationStrategy;
  messageStructure: MessageStructure;
}

export class CopywriterEngine {
  createCopyBlocks(input: CopywriterEngineInput): CopyBlockSet {
    const blocks: CopyBlock[] = [];
    const warnings: string[] = [...input.messageStructure.warnings];
    const variables = input.messageStructure.variablePlaceholders;

    if (input.messageStructure.sections.some((section) => section.type === MessageSectionType.Opening)) {
      blocks.push(createBlock({
        kind: CopyBlockKind.Header,
        sectionType: MessageSectionType.Opening,
        text: createOpening(input.businessContext, input.communicationStrategy),
        variables: [],
        rationale: "Opening identifies the sender or frames the message context.",
      }));
    }

    blocks.push(createBlock({
      kind: CopyBlockKind.BodyOpening,
      sectionType: MessageSectionType.Context,
      text: createBodyOpening(input.communicationStrategy, variables),
      variables: variableNames(variables),
      rationale: "Body opening creates a clear, channel-safe start for the recipient.",
    }));

    blocks.push(createBlock({
      kind: CopyBlockKind.BodyMain,
      sectionType: MessageSectionType.MainMessage,
      text: createMainMessage(input.communicationStrategy, variables),
      variables: variableNames(variables),
      rationale: "Main copy realizes the normalized campaign goal without external facts.",
    }));

    if (input.messageStructure.sections.some((section) => section.type === MessageSectionType.CallToAction)) {
      blocks.push(createBlock({
        kind: CopyBlockKind.BodyCta,
        sectionType: MessageSectionType.CallToAction,
        text: createCtaText(input.communicationStrategy),
        variables: [],
        rationale: "CTA copy follows the strategy while staying independent from Meta payload shape.",
      }));
    }

    if (input.messageStructure.sections.some((section) => section.type === MessageSectionType.Footer)) {
      blocks.push(createBlock({
        kind: CopyBlockKind.Footer,
        sectionType: MessageSectionType.Footer,
        text: createFooter(input.businessContext, input.communicationStrategy),
        variables: [],
        rationale: "Footer keeps the sender identity and constraints explicit.",
      }));
    }

    for (const buttonText of createButtonTexts(input.communicationStrategy)) {
      blocks.push(createBlock({
        kind: CopyBlockKind.Button,
        sectionType: MessageSectionType.ButtonSet,
        text: buttonText,
        variables: [],
        rationale: "Button text is generated from CTA strategy.",
      }));
    }

    if (input.communicationStrategy.recommendedCategory === TemplateCategory.Marketing) {
      warnings.push("Marketing copy should be reviewed for consent, urgency, and offer accuracy.");
    }

    return {
      id: randomUUID(),
      blocks,
      warnings: unique(warnings),
    };
  }
}

function createOpening(
  businessContext: BusinessContext,
  strategy: CommunicationStrategy
): string {
  if (strategy.recommendedCategory === TemplateCategory.Authentication) {
    return businessContext.name;
  }

  return businessContext.name.slice(0, 60);
}

function createBodyOpening(
  strategy: CommunicationStrategy,
  variables: MessageVariablePlaceholder[]
): string {
  const customer = variables.find((variable) => variable.name === "customer_name");
  if (customer) {
    return `Ola ${customer.token},`;
  }
  return "Ola,";
}

function createMainMessage(
  strategy: CommunicationStrategy,
  variables: MessageVariablePlaceholder[]
): string {
  if (strategy.recommendedCategory === TemplateCategory.Authentication) {
    const code = variables[0]?.token ?? "{{1}}";
    return `seu codigo de verificacao e ${code}. Nao compartilhe com ninguem.`;
  }

  const reference = variables.find((variable) => variable.name === "event_reference");
  const time = variables.find((variable) => variable.name === "scheduled_time");
  const referenceText = reference ? ` sobre ${reference.token}` : "";
  const timeText = time ? ` em ${time.token}` : "";

  if (strategy.objective === CommunicationObjective.Promote) {
    return `temos uma mensagem especial para voce${referenceText}.`;
  }

  if (strategy.objective === CommunicationObjective.Remind) {
    return `passando para lembrar voce${referenceText}${timeText}.`;
  }

  if (strategy.objective === CommunicationObjective.Confirm) {
    return `precisamos confirmar as informacoes${referenceText}${timeText}.`;
  }

  return `${strategy.campaignIntent.normalizedGoal}${referenceText}${timeText}.`;
}

function createCtaText(strategy: CommunicationStrategy): string {
  if (strategy.cta.type === CtaStrategyType.QuickReply) {
    return "Responda com a opcao que preferir.";
  }
  if (strategy.cta.type === CtaStrategyType.VisitUrl) {
    return "Acesse o link para continuar.";
  }
  if (strategy.cta.type === CtaStrategyType.CallPhone) {
    return "Fale com a nossa equipe se precisar de ajuda.";
  }
  if (strategy.cta.type === CtaStrategyType.CopyCode) {
    return "Use o botao para copiar o codigo.";
  }
  return "";
}

function createFooter(
  businessContext: BusinessContext,
  strategy: CommunicationStrategy
): string {
  if (strategy.recommendedCategory === TemplateCategory.Marketing) {
    return `${businessContext.name} - mensagem informativa`;
  }
  return businessContext.name;
}

function createButtonTexts(strategy: CommunicationStrategy): string[] {
  if (strategy.cta.type === CtaStrategyType.QuickReply) return [strategy.cta.labelHint ?? "Confirmar"];
  if (strategy.cta.type === CtaStrategyType.VisitUrl) return [strategy.cta.labelHint ?? "Acessar"];
  if (strategy.cta.type === CtaStrategyType.CallPhone) return [strategy.cta.labelHint ?? "Ligar"];
  if (strategy.cta.type === CtaStrategyType.CopyCode) return ["Copiar codigo"];
  return [];
}

function createBlock(input: {
  kind: CopyBlockKind;
  sectionType: MessageSectionType;
  text: string;
  variables: string[];
  rationale: string;
}): CopyBlock {
  return {
    id: randomUUID(),
    kind: input.kind,
    sectionType: input.sectionType,
    variantRole: CopyBlockVariantRole.Primary,
    text: input.text,
    variables: input.variables,
    rationale: input.rationale,
    warnings: [],
  };
}

function variableNames(variables: MessageVariablePlaceholder[]): string[] {
  return variables.map((variable) => variable.name);
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}
