import { useMemo, useState } from "react";
import {
  approveReviewSession,
  rejectReviewSession,
  requestReviewChanges,
} from "../../services/review.service";
import type { PipelineResponse, ReviewActionResult } from "../../types/pipeline";
import { Metric } from "../shared/Metric";
import { ApprovalDecisionSummary } from "./ApprovalDecisionSummary";
import { RevisionSuggestionsPanel } from "./RevisionSuggestionsPanel";
import { VersionComparisonPanel, buildVariants } from "./VersionComparisonPanel";

export function ApprovalPanel({ result }: { result: PipelineResponse | null }) {
  const [selectedVariantId, setSelectedVariantId] = useState("balanced");
  const [reviewer, setReviewer] = useState("Operator");
  const [comment, setComment] = useState("");
  const [reviewActionLoading, setReviewActionLoading] = useState<"approve" | "reject" | "request_changes" | null>(null);
  const [reviewActionResult, setReviewActionResult] = useState<ReviewActionResult | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const audit = result?.auditReport;
  const humanReview = result?.humanReview;
  const latestReviewSession = reviewActionResult?.reviewSession ?? result?.reviewSession;
  const gate = latestReviewSession?.approvalGate ?? humanReview?.approvalGate ?? audit?.submissionGate;
  const variants = useMemo(() => buildVariants(result), [result]);
  const selectedVariant = variants.find((variant) => variant.id === selectedVariantId) ?? variants[1];
  const reviewSessionId = humanReview?.reviewSessionId ?? result?.reviewSession?.id;
  const snapshotHash = humanReview?.snapshotHash ?? result?.reviewSnapshot?.hash ?? result?.reviewSession?.currentSnapshot?.hash;
  const snapshotVersion = humanReview?.snapshotVersion ?? result?.reviewSnapshot?.version ?? result?.reviewSession?.currentSnapshot?.version;
  const canSubmitReviewAction = Boolean(reviewSessionId && snapshotHash && snapshotVersion && reviewer.trim() && !reviewActionLoading);

  return (
    <section className="panel approval-panel">
      <h2>Operational review</h2>
      {!result ? (
        <>
          <p className="muted">A revisao operacional aparece depois da geracao do draft.</p>
          <OperatorReviewFlow activeStep="revisar" />
          <VersionComparisonPanel result={null} selectedVariantId={selectedVariantId} onSelectVariant={setSelectedVariantId} />
        </>
      ) : (
        <>
          <OperatorReviewFlow activeStep={audit?.status === "READY_FOR_REVIEW" ? "aprovar" : "ajustar"} />

          {audit && (
            <>
              <p className="summary">{audit.summary}</p>
              <div className="metric-row single-column">
                <Metric label="Audit status" value={audit.status} />
                <Metric label="Risk level" value={audit.riskLevel} />
                <Metric label="Gate" value={gate ? gateLabel(gate) : "Aguardando"} />
              </div>
            </>
          )}

          {humanReview && (
            <div className="review-snapshot">
              <span>Review session</span>
              <strong>{reviewSessionId}</strong>
              <span>Snapshot v{humanReview.snapshotVersion}</span>
              <code>{humanReview.snapshotHash.slice(0, 16)}...</code>
            </div>
          )}

          <VersionComparisonPanel result={result} selectedVariantId={selectedVariantId} onSelectVariant={setSelectedVariantId} />
          <RevisionSuggestionsPanel result={result} selectedVariant={selectedVariant} />
          <ApprovalDecisionSummary result={result} selectedVariant={selectedVariant} reviewActionResult={reviewActionResult} />

          <section className="review-action-form">
            <label>
              Reviewer
              <input
                value={reviewer}
                onChange={(event) => setReviewer(event.target.value)}
                disabled={Boolean(reviewActionLoading)}
              />
            </label>
            <label>
              Comentario operacional
              <textarea
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                disabled={Boolean(reviewActionLoading)}
                placeholder="Opcional: registre contexto da decisao."
              />
            </label>
          </section>

          {reviewActionResult?.success && (
            <section className="review-feedback success">
              <strong>Decisao registrada</strong>
              <p>
                Status: {reviewActionResult.reviewStatus ?? "atualizado"}. Gate: {reviewActionResult.gateStatus ?? "reavaliado"}.
                {reviewActionResult.approvalToken ? " Approval token emitido." : ""}
              </p>
            </section>
          )}

          {reviewError && (
            <section className="review-feedback error">
              <strong>Acao nao concluida</strong>
              <p>{reviewError}</p>
            </section>
          )}

          <div className="approval-actions">
            <button type="button" disabled={!canSubmitReviewAction} onClick={() => submitReviewAction("approve")}>
              {reviewActionLoading === "approve" ? "Aprovando..." : "Aprovar snapshot"}
            </button>
            <button type="button" disabled={!canSubmitReviewAction} onClick={() => submitReviewAction("request_changes")}>
              {reviewActionLoading === "request_changes" ? "Registrando..." : "Pedir ajustes"}
            </button>
            <button type="button" disabled={!canSubmitReviewAction} onClick={() => submitReviewAction("reject")}>
              {reviewActionLoading === "reject" ? "Rejeitando..." : "Rejeitar"}
            </button>
          </div>
          <p className="muted">As decisoes sao enviadas para o review backend usando o snapshot atual congelado.</p>
        </>
      )}
    </section>
  );

  async function submitReviewAction(action: "approve" | "reject" | "request_changes") {
    if (!reviewSessionId || !snapshotHash || !snapshotVersion) {
      setReviewError("Review session ou snapshot indisponivel para registrar a decisao.");
      return;
    }

    setReviewActionLoading(action);
    setReviewError(null);
    setReviewActionResult(null);

    const payload = {
      reviewer: reviewer.trim(),
      comment: comment.trim() || undefined,
      snapshotHash,
      snapshotVersion,
    };

    try {
      const response =
        action === "approve"
          ? await approveReviewSession(reviewSessionId, payload)
          : action === "reject"
            ? await rejectReviewSession(reviewSessionId, payload)
            : await requestReviewChanges(reviewSessionId, payload);

      if (!response.success) {
        setReviewError(response.error?.message ?? "O backend recusou a decisao de review.");
        setReviewActionResult(response);
        return;
      }

      setReviewActionResult(response);
    } catch (error) {
      setReviewError(error instanceof Error ? error.message : "Falha inesperada ao registrar decisao.");
    } finally {
      setReviewActionLoading(null);
    }
  }
}

function gateLabel(gate: { allowed?: boolean; canCompile?: boolean; status?: string }) {
  if ("canCompile" in gate) return gate.canCompile ? "Compile liberado" : gate.status ?? "Bloqueado";
  return gate.allowed ? "Allowed" : "Blocked";
}

function OperatorReviewFlow({ activeStep }: { activeStep: "revisar" | "ajustar" | "comparar" | "aprovar" }) {
  const steps = ["revisar", "ajustar", "comparar", "aprovar", "compilar"];
  const activeIndex = steps.indexOf(activeStep);

  return (
    <section className="operator-review-flow">
      {steps.map((step, index) => (
        <div className={`review-flow-step ${index <= activeIndex ? "active" : ""}`} key={step}>
          <span>{index + 1}</span>
          <strong>{step}</strong>
        </div>
      ))}
    </section>
  );
}
