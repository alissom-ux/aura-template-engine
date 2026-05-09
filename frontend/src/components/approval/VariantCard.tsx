import { TradeoffIndicator } from "./TradeoffIndicator";

export interface TemplateVariant {
  id: string;
  title: string;
  tone: "safe" | "balanced" | "aggressive";
  body: string;
  risk: string;
  cta: string;
  compliance: string;
  whyChoose: string;
  tradeoffs: string[];
}

interface VariantCardProps {
  variant: TemplateVariant;
  selected: boolean;
  onSelect: (variantId: string) => void;
}

export function VariantCard({ variant, selected, onSelect }: VariantCardProps) {
  return (
    <article className={`variant-card ${variant.tone} ${selected ? "selected" : ""}`}>
      <div className="variant-heading">
        <div>
          <h3>{variant.title}</h3>
          <TradeoffIndicator label={variantLabel(variant.tone)} tone={variant.tone} />
        </div>
        <button className="secondary-button" onClick={() => onSelect(variant.id)} type="button">
          {selected ? "Selecionada" : "Comparar"}
        </button>
      </div>

      <p className="variant-copy">{variant.body}</p>

      <div className="variant-metrics">
        <span>Risco: <strong>{variant.risk}</strong></span>
        <span>CTA: <strong>{variant.cta}</strong></span>
        <span>Compliance: <strong>{variant.compliance}</strong></span>
      </div>

      <div className="why-block">
        <span>Why choose this version</span>
        <p>{variant.whyChoose}</p>
      </div>

      <ul className="tradeoff-list">
        {variant.tradeoffs.map((tradeoff) => (
          <li key={tradeoff}>{tradeoff}</li>
        ))}
      </ul>
    </article>
  );
}

function variantLabel(tone: TemplateVariant["tone"]) {
  if (tone === "safe") return "versao segura";
  if (tone === "aggressive") return "versao agressiva";
  return "versao equilibrada";
}
