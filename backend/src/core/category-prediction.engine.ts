import type { CampaignIntent } from "./campaign-intent.model.js";
import type { CommunicationStrategy } from "./communication-strategy.model.js";
import type { CopyBlockSet } from "./copy-block.model.js";
import { TemplateCategory } from "./enums.js";
import type { CategoryPrediction } from "./policy-review.model.js";
import type { TemplateComponent } from "./template.model.js";

export interface CategoryPredictionInput {
  campaignIntent: CampaignIntent;
  communicationStrategy: CommunicationStrategy;
  copyBlocks: CopyBlockSet;
  templateComponents: TemplateComponent[];
}

const MARKETING_SIGNALS = ["oferta", "desconto", "promocao", "novidade", "especial", "reativar", "sumiram", "voltar"];
const UTILITY_SIGNALS = ["confirmar", "pedido", "agendamento", "lembrete", "status", "pagamento", "retirada"];
const AUTH_SIGNALS = ["codigo", "verificacao", "senha", "login", "token"];

export class CategoryPredictionEngine {
  predict(input: CategoryPredictionInput): CategoryPrediction {
    const declaredCategory = input.communicationStrategy.recommendedCategory;
    const text = normalize([
      input.campaignIntent.rawIntent,
      input.campaignIntent.normalizedGoal,
      input.copyBlocks.blocks.map((block) => block.text).join(" "),
      collectComponentText(input.templateComponents),
    ].join(" "));
    const scores = {
      [TemplateCategory.Marketing]: scoreSignals(text, MARKETING_SIGNALS),
      [TemplateCategory.Utility]: scoreSignals(text, UTILITY_SIGNALS),
      [TemplateCategory.Authentication]: scoreSignals(text, AUTH_SIGNALS),
    };
    const predictedCategory = maxCategory(scores);
    const total = Object.values(scores).reduce((sum, score) => sum + score, 0) || 1;
    const probability = scores[predictedCategory] / total;
    const confidence = Math.max(0.5, Math.min(0.92, probability));
    const overrideRecommended = predictedCategory !== declaredCategory && probability >= 0.45;

    return {
      declaredCategory,
      predictedCategory,
      overrideRecommended,
      probability,
      confidence,
      rationale: buildRationale(declaredCategory, predictedCategory, scores),
    };
  }
}

function scoreSignals(text: string, signals: string[]): number {
  const matches = signals.filter((signal) => text.includes(signal)).length;
  return 1 + matches * 2;
}

function maxCategory(scores: Record<TemplateCategory, number>): TemplateCategory {
  return (Object.entries(scores).sort((a, b) => b[1] - a[1])[0]?.[0] ?? TemplateCategory.Utility) as TemplateCategory;
}

function buildRationale(
  declaredCategory: TemplateCategory,
  predictedCategory: TemplateCategory,
  scores: Record<TemplateCategory, number>
): string[] {
  return [
    `Declared category: ${declaredCategory}.`,
    `Predicted category: ${predictedCategory}.`,
    `Signal scores: marketing=${scores.MARKETING}, utility=${scores.UTILITY}, authentication=${scores.AUTHENTICATION}.`,
  ];
}

function collectComponentText(components: TemplateComponent[]): string {
  return components.map((component) => {
    if (component.type === "BODY" || component.type === "FOOTER" || component.type === "HEADER") return component.text ?? "";
    return component.buttons.map((button) => "text" in button ? button.text : button.example).join(" ");
  }).join(" ");
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
