import type { PipelineResponse } from "../../types/pipeline";
import type { TemplateVariant } from "./VariantCard";

interface RevisionSuggestionsPanelProps {
  result: PipelineResponse | null;
  selectedVariant?: TemplateVariant;
}

export function RevisionSuggestionsPanel({ result, selectedVariant }: RevisionSuggestionsPanelProps) {
  const suggestions = buildRevisionSuggestions(result, selectedVariant);

  return (
    <section className="revision-suggestions-panel">
      <div>
        <h2>Revision suggestions</h2>
        <p className="muted">Ajustes operacionais antes de aprovar ou pedir mudancas.</p>
      </div>

      <div className="revision-list">
        {suggestions.map((suggestion) => (
          <article className="revision-suggestion" key={suggestion.title}>
            <h3>{suggestion.title}</h3>
            <p>{suggestion.body}</p>
            <span>{suggestion.impact}</span>
          </article>
        ))}
      </div>
    </section>
  );
}

function buildRevisionSuggestions(result: PipelineResponse | null, selectedVariant?: TemplateVariant) {
  const policySuggestion = result?.policyReview?.suggestions[0]?.message;
  const auditAction = result?.auditReport?.recommendedActions[0];
  const selectedTone = selectedVariant?.tone ?? "balanced";

  return [
    {
      title: "Checar categoria Meta",
      body: result?.policyReview?.categoryPrediction.overrideRecommended
        ? "A categoria percebida diverge da declarada. Confirme antes de aprovar."
        : "Categoria parece coerente com a leitura atual do pipeline.",
      impact: "Reduz risco de rejeicao por categoria incorreta.",
    },
    {
      title: "Ajustar tradeoff da versao",
      body: selectedTone === "safe"
        ? "A versao segura favorece aprovacao, mas pode reduzir resposta."
        : selectedTone === "aggressive"
          ? "A versao agressiva favorece engajamento, mas pede revisao cuidadosa de compliance."
          : "A versao equilibrada preserva a decisao mais estavel para review.",
      impact: "Ajuda o operador a alinhar campanha, risco e expectativa de resposta.",
    },
    {
      title: "Aplicar correcao prioritaria",
      body: policySuggestion || auditAction || "Nenhuma correcao critica foi apontada; revise clareza, CTA e tom.",
      impact: "Evita retrabalho antes da aprovacao interna.",
    },
  ];
}
