import type { PipelineResponse } from "../../types/pipeline";
import { VariantCard, type TemplateVariant } from "./VariantCard";

interface VersionComparisonPanelProps {
  result: PipelineResponse | null;
  selectedVariantId: string;
  onSelectVariant: (variantId: string) => void;
}

export function VersionComparisonPanel({ result, selectedVariantId, onSelectVariant }: VersionComparisonPanelProps) {
  const variants = buildVariants(result);

  return (
    <section className="version-comparison-panel">
      <div>
        <h2>Comparacao de versoes</h2>
        <p className="muted">Variantes derivadas do draft atual para apoiar decisao operacional. Nao alteram o pipeline.</p>
      </div>

      <div className="variant-grid">
        {variants.map((variant) => (
          <VariantCard
            key={variant.id}
            variant={variant}
            selected={selectedVariantId === variant.id}
            onSelect={onSelectVariant}
          />
        ))}
      </div>
    </section>
  );
}

export function buildVariants(result: PipelineResponse | null): TemplateVariant[] {
  const baseBody = getBodyText(result) || "Mensagem ainda nao gerada. O comparativo aparece depois do draft.";
  const category = result?.communicationStrategy?.recommendedCategory || result?.policyReview?.categoryPrediction.predictedCategory || "MARKETING";
  const risk = result?.auditReport?.riskLevel || result?.policyReview?.risk.estimatedRisk || "MEDIUM";
  const cta = readString(result?.communicationStrategy?.cta?.label) || readString(result?.communicationStrategy?.cta?.type) || "Resposta";

  return [
    {
      id: "safe",
      title: "Segura",
      tone: "safe",
      body: makeSafeCopy(baseBody),
      risk: lowerRisk(risk),
      cta: "Leve",
      compliance: "Maior chance de aprovacao",
      whyChoose: "Escolha quando a prioridade for reduzir risco Meta, evitar urgencia e manter linguagem neutra.",
      tradeoffs: ["menor pressao comercial", "mais neutra", `categoria preservada: ${category}`],
    },
    {
      id: "balanced",
      title: "Equilibrada",
      tone: "balanced",
      body: baseBody,
      risk,
      cta,
      compliance: "Mantem parecer atual",
      whyChoose: "Escolha quando o draft atual ja equilibra clareza, CTA e risco operacional.",
      tradeoffs: ["mantem tom original", "preserva CTA atual", "boa base para review humano"],
    },
    {
      id: "aggressive",
      title: "Mais engajadora",
      tone: "aggressive",
      body: makeEngagingCopy(baseBody),
      risk: raiseRisk(risk),
      cta: "Mais forte",
      compliance: "Requer revisao cuidadosa",
      whyChoose: "Escolha quando a meta for resposta mais forte, aceitando maior atencao a warnings.",
      tradeoffs: ["CTA mais evidente", "mais persuasiva", "maior chance de warning Meta"],
    },
  ];
}

function getBodyText(result: PipelineResponse | null) {
  return result?.templateComponents?.find((component) => component.type === "BODY")?.text ?? "";
}

function makeSafeCopy(value: string) {
  return value
    .replace(/agora/gi, "quando puder")
    .replace(/ultima chance/gi, "ainda e possivel")
    .replace(/corra/gi, "confira");
}

function makeEngagingCopy(value: string) {
  if (!value.trim()) return value;
  return `${value}\n\nSe fizer sentido para voce, responda esta mensagem e retomamos por aqui.`;
}

function lowerRisk(value: string) {
  if (value === "CRITICAL") return "HIGH";
  if (value === "HIGH") return "MEDIUM";
  if (value === "MEDIUM") return "LOW";
  return value;
}

function raiseRisk(value: string) {
  if (value === "LOW") return "MEDIUM";
  if (value === "MEDIUM") return "HIGH";
  return value;
}

function readString(value: unknown) {
  return typeof value === "string" ? value : "";
}
