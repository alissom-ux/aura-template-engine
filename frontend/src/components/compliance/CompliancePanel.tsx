import type { PipelineResponse } from "../../types/pipeline";
import type { PreviewHighlightTarget } from "../../types/preview";
import { Metric } from "../shared/Metric";

interface CompliancePanelProps {
  result: PipelineResponse | null;
  onSelectPreviewTarget?: (target: PreviewHighlightTarget | null) => void;
}

interface ComplianceIssue {
  label: string;
  rule?: string;
  severity?: string;
  target?: PreviewHighlightTarget;
}

export function CompliancePanel({ result, onSelectPreviewTarget }: CompliancePanelProps) {
  const policy = result?.policyReview;
  const audit = result?.auditReport;
  const blocks = [
    ...(policy?.violations.map((item) => ({
      label: item.behavioralInterpretation,
      rule: item.rule,
      severity: item.severity,
      target: buildIssueTarget(item.affectedText),
    })) ?? []),
    ...(audit?.blockingIssues.map((item) => ({ label: item, severity: "block" })) ?? []),
    ...(result?.errors?.map((item) => ({ label: item.message, rule: item.code, severity: "block" })) ?? []),
  ];
  const warnings = [
    ...(result?.warnings?.map((item) => ({ label: item, severity: "warn" })) ?? []),
    ...(policy?.warnings.map((item) => ({
      label: item.behavioralInterpretation,
      rule: item.rule,
      severity: item.severity,
      target: buildIssueTarget(item.affectedText),
    })) ?? []),
    ...(audit?.warnings.map((item) => ({ label: item, severity: "warn" })) ?? []),
  ];
  const suggestions = [
    ...(policy?.suggestions.map((item) => ({
      label: item.message,
      rule: item.priority,
      severity: "suggestion",
      target: buildIssueTarget(item.target),
    })) ?? []),
    ...(audit?.recommendedActions.map((item) => ({ label: item, severity: "suggestion" })) ?? []),
  ];

  return (
    <section className="right-stack">
      <section className="panel">
        <h2>Compliance Meta</h2>
        {!policy ? (
          <p className="muted">Aguardando policy review do pipeline.</p>
        ) : (
          <>
            <div className="metric-row single-column">
              <Metric label="Status" value={policy.status} />
              <Metric label="Risco" value={policy.risk.estimatedRisk} />
              <Metric label="Categoria" value={`${policy.categoryPrediction.declaredCategory} -> ${policy.categoryPrediction.predictedCategory}`} />
            </div>
            <p className="summary">{policy.behavioralSummary}</p>
          </>
        )}
      </section>

      <ComplianceIssueList title="Blocks" items={blocks} tone="danger" onSelectPreviewTarget={onSelectPreviewTarget} />
      <ComplianceIssueList title="Warnings" items={warnings} tone="warning" onSelectPreviewTarget={onSelectPreviewTarget} />
      <ComplianceIssueList title="Suggestions" items={suggestions} tone="neutral" onSelectPreviewTarget={onSelectPreviewTarget} />
    </section>
  );
}

function ComplianceIssueList({
  title,
  items,
  tone,
  onSelectPreviewTarget,
}: {
  title: string;
  items: ComplianceIssue[];
  tone: "danger" | "warning" | "neutral";
  onSelectPreviewTarget?: (target: PreviewHighlightTarget | null) => void;
}) {
  const cleanItems = dedupeIssues(items);

  return (
    <section className={`panel issue-panel ${tone}`}>
      <h2>{title}</h2>
      {cleanItems.length === 0 ? (
        <p className="muted">Nenhum item.</p>
      ) : (
        <ul className="clickable-issue-list">
          {cleanItems.slice(0, 8).map((item, index) => (
            <li key={`${item.label}-${index}`}>
              <button
                className="issue-link"
                disabled={!item.target}
                onClick={() => item.target && onSelectPreviewTarget?.(item.target)}
                type="button"
              >
                <span>{item.label}</span>
                {item.rule && <small>Politica: {item.rule}</small>}
                <small>Why this matters: {issueImpact(tone)}</small>
                <small>Recommended fix: {recommendedFix(item.label, tone)}</small>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function issueImpact(tone: "danger" | "warning" | "neutral") {
  if (tone === "danger") return "pode bloquear aprovacao interna ou aumentar chance de rejeicao Meta.";
  if (tone === "warning") return "nao bloqueia sozinho, mas pode reduzir qualidade ou confianca operacional.";
  return "melhora clareza, aderencia e consistencia antes da revisao.";
}

function recommendedFix(label: string, tone: "danger" | "warning" | "neutral") {
  const normalized = label.toLowerCase();
  if (normalized.includes("category") || normalized.includes("categoria") || normalized.includes("utility")) {
    return "ajustar a categoria ou remover conteudo promocional.";
  }
  if (normalized.includes("urg") || normalized.includes("press")) {
    return "reduzir urgencia e usar linguagem mais neutra.";
  }
  if (normalized.includes("cta") || normalized.includes("button")) {
    return "simplificar o CTA e deixar a acao mais especifica.";
  }
  if (tone === "danger") return "reescrever o trecho apontado antes de seguir para aprovacao.";
  if (tone === "warning") return "revisar linguagem e reduzir ambiguidade.";
  return "aplicar a sugestao se ela fortalecer clareza ou aprovacao.";
}

function buildIssueTarget(value?: string): PreviewHighlightTarget | undefined {
  const cleanValue = value?.trim();
  if (!cleanValue) return undefined;
  return { kind: cleanValue.match(/^\{\{\d+\}\}$/) ? "variable" : "issue", value: cleanValue };
}

function dedupeIssues(items: ComplianceIssue[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (!item.label || seen.has(item.label)) return false;
    seen.add(item.label);
    return true;
  });
}
