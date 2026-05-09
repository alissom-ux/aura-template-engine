import type { PipelineResponse, ReviewActionResult } from "../../types/pipeline";
import type { TemplateVariant } from "./VariantCard";

interface ApprovalDecisionSummaryProps {
  result: PipelineResponse | null;
  selectedVariant?: TemplateVariant;
  reviewActionResult?: ReviewActionResult | null;
}

export function ApprovalDecisionSummary({ result, selectedVariant, reviewActionResult }: ApprovalDecisionSummaryProps) {
  const audit = result?.auditReport;
  const gate = reviewActionResult?.reviewSession?.approvalGate ?? result?.humanReview?.approvalGate ?? audit?.submissionGate;
  const canApprove = Boolean(result && audit?.status === "READY_FOR_REVIEW" && selectedVariant?.id === "balanced");
  const decisionStatus = reviewActionResult?.success
    ? reviewActionResult.reviewStatus ?? "Registrada"
    : canApprove
      ? "Aprovar internamente"
      : "Revisar antes de aprovar";

  return (
    <section className="decision-summary">
      <div>
        <h2>Resumo da decisao</h2>
        <p className="muted">O operador decide com base em risco, compliance, CTA e snapshot atual.</p>
      </div>

      <div className="decision-grid">
        <DecisionItem label="Versao escolhida" value={selectedVariant?.title ?? "Aguardando draft"} />
        <DecisionItem label="Risco" value={selectedVariant?.risk ?? audit?.riskLevel ?? "A definir"} />
        <DecisionItem label="Gate" value={gate ? gateLabel(gate) : "Aguardando"} />
        <DecisionItem label="Decisao" value={decisionStatus} />
      </div>
    </section>
  );
}

function DecisionItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="decision-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function gateLabel(gate: { allowed?: boolean; canCompile?: boolean; status?: string }) {
  if ("canCompile" in gate) return gate.canCompile ? "Compile liberado" : gate.status ?? "Bloqueado";
  return gate.allowed ? "Allowed" : "Blocked";
}
