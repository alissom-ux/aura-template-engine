import type { PipelineResponse } from "../../types/pipeline";
import type { PreviewHighlightTarget } from "../../types/preview";
import { Metric } from "../shared/Metric";
import { WhatsAppPreview } from "../preview/WhatsAppPreview";
import { ReasoningPanel } from "../explainability/ReasoningPanel";

interface StrategyWorkspaceProps {
  result: PipelineResponse | null;
  selectedPreviewTarget?: PreviewHighlightTarget | null;
  onSelectPreviewTarget?: (target: PreviewHighlightTarget | null) => void;
}

export function StrategyWorkspace({ result, selectedPreviewTarget, onSelectPreviewTarget }: StrategyWorkspaceProps) {
  if (!result) {
    return (
      <section className="workspace-center">
        <section className="panel empty-state">
          <h2>Workspace de estrategia</h2>
          <p>Quando voce gerar um draft, a estrategia recomendada e o preview WhatsApp aparecem aqui.</p>
        </section>
        <ReasoningPanel result={null} />
        <WhatsAppPreview components={[]} selectedTarget={selectedPreviewTarget} onSelectTarget={onSelectPreviewTarget} />
      </section>
    );
  }

  const strategy = result.communicationStrategy;
  const intent = result.campaignIntent;
  const policy = result.policyReview;

  return (
    <section className="workspace-center">
      <section className={`status-strip ${result.success ? "ok" : "attention"}`}>
        <strong>{result.success ? "Draft auditavel gerado" : "Pipeline precisa de ajustes"}</strong>
        <span>{result.nextStep ?? "Sem proximo passo informado"}</span>
      </section>

      <section className="panel">
        <h2>Estrategia operacional</h2>
        <p className="summary">
          {readString(strategy?.messagingGoal) ||
            readString(intent?.goal) ||
            "Estrategia recebida do pipeline atual. Use os paineis laterais para revisar risco, categoria e aprovacao."}
        </p>
        <div className="metric-row">
          <Metric
            label="Categoria"
            value={readString(strategy?.recommendedCategory) || policy?.categoryPrediction.predictedCategory || "A definir"}
          />
          <Metric label="Risco" value={readString(strategy?.risk?.level) || policy?.risk.estimatedRisk || "A definir"} />
          <Metric label="CTA" value={readString(strategy?.cta?.label) || readString(strategy?.cta?.type) || "A definir"} />
        </div>
      </section>

      <section className="strategy-grid">
        <StrategyCard title="Mensagens-chave" items={strategy?.keyMessages ?? []} empty="Sem mensagens-chave estruturadas." />
        <StrategyCard title="Racional" items={strategy?.rationale ?? []} empty="Sem racional adicional informado." />
        <StrategyCard title="Mitigacao de risco" items={strategy?.risk?.mitigationHints ?? []} empty="Nenhuma mitigacao adicional." />
      </section>

      <ReasoningPanel result={result} />

      <WhatsAppPreview
        components={result.templateComponents ?? []}
        category={readString(strategy?.recommendedCategory) || policy?.categoryPrediction.predictedCategory}
        language="pt_BR"
        policyReview={result.policyReview}
        auditReport={result.auditReport}
        selectedTarget={selectedPreviewTarget}
        onSelectTarget={onSelectPreviewTarget}
      />
    </section>
  );
}

function StrategyCard({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  const cleanItems = items.filter(Boolean);
  return (
    <section className="panel compact-panel">
      <h2>{title}</h2>
      {cleanItems.length === 0 ? (
        <p className="muted">{empty}</p>
      ) : (
        <ul className="compact-list">
          {cleanItems.slice(0, 4).map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}
