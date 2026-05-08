import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { createTemplateDraft } from "./services/pipeline.service";
import type { PipelineResponse, TemplateComponent } from "./types/pipeline";
import "./styles.css";

const initialPrompt = "crie um modelo para reativar clientes que sumiram";

function App() {
  const [userPrompt, setUserPrompt] = useState(initialPrompt);
  const [companyName, setCompanyName] = useState("Materna");
  const [industry, setIndustry] = useState("servicos previdenciarios");
  const [brandVoice, setBrandVoice] = useState("acolhedor, humano e claro");
  const [category, setCategory] = useState<"MARKETING" | "UTILITY" | "AUTHENTICATION">("MARKETING");
  const [result, setResult] = useState<PipelineResponse | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    const response = await createTemplateDraft({
      userPrompt,
      businessContext: { companyName, industry, brandVoice },
      defaults: { category, language: "pt_BR" },
    });
    setResult(response);
    setLoading(false);
  }

  return (
    <main className="app-shell">
      <section className="workspace">
        <form className="panel composer" onSubmit={handleSubmit}>
          <div>
            <p className="eyebrow">Aura Template Engine</p>
            <h1>Template draft</h1>
          </div>

          <label>
            Intent
            <textarea value={userPrompt} onChange={(event) => setUserPrompt(event.target.value)} />
          </label>

          <div className="field-grid">
            <label>
              Empresa
              <input value={companyName} onChange={(event) => setCompanyName(event.target.value)} />
            </label>
            <label>
              Segmento
              <input value={industry} onChange={(event) => setIndustry(event.target.value)} />
            </label>
          </div>

          <label>
            Voz da marca
            <input value={brandVoice} onChange={(event) => setBrandVoice(event.target.value)} />
          </label>

          <label>
            Categoria
            <select value={category} onChange={(event) => setCategory(event.target.value as typeof category)}>
              <option value="MARKETING">MARKETING</option>
              <option value="UTILITY">UTILITY</option>
              <option value="AUTHENTICATION">AUTHENTICATION</option>
            </select>
          </label>

          <button type="submit" disabled={loading}>{loading ? "Gerando..." : "Gerar draft"}</button>
        </form>

        <section className="results">
          {!result ? <EmptyState /> : <PipelineResultView result={result} />}
        </section>
      </section>
    </main>
  );
}

function PipelineResultView({ result }: { result: PipelineResponse }) {
  const audit = result.auditReport;
  const policy = result.policyReview;

  return (
    <>
      <section className={`status-strip ${result.success ? "ok" : "attention"}`}>
        <strong>{result.success ? "Draft auditavel gerado" : "Pipeline precisa de ajustes"}</strong>
        <span>{result.nextStep ?? "Sem proximo passo informado"}</span>
      </section>

      {audit && (
        <section className="panel">
          <h2>Audit summary</h2>
          <p className="summary">{audit.summary}</p>
          <div className="metric-row">
            <Metric label="Status" value={audit.status} />
            <Metric label="Risk" value={audit.riskLevel} />
            <Metric label="Submission" value={audit.submissionGate.allowed ? "Allowed" : "Blocked"} />
          </div>
        </section>
      )}

      <IssueList title="Blocking issues" items={audit?.blockingIssues ?? result.errors?.map((item) => item.message) ?? []} tone="danger" />
      <IssueList title="Warnings" items={[...(result.warnings ?? []), ...(audit?.warnings ?? [])]} tone="warning" />
      <IssueList title="Recommended actions" items={audit?.recommendedActions ?? []} tone="neutral" />

      {policy && (
        <section className="panel">
          <h2>Policy review</h2>
          <div className="metric-row">
            <Metric label="Status" value={policy.status} />
            <Metric label="Risk" value={policy.risk.estimatedRisk} />
            <Metric label="Category" value={`${policy.categoryPrediction.declaredCategory} -> ${policy.categoryPrediction.predictedCategory}`} />
          </div>
          <p className="summary">{policy.behavioralSummary}</p>
          <IssueList title="Policy violations" items={policy.violations.map((item) => item.behavioralInterpretation)} tone="danger" compact />
          <IssueList title="Policy suggestions" items={policy.suggestions.map((item) => item.message)} tone="neutral" compact />
        </section>
      )}

      <TemplatePreview components={result.templateComponents ?? []} />
    </>
  );
}

function TemplatePreview({ components }: { components: TemplateComponent[] }) {
  const header = components.find((component) => component.type === "HEADER");
  const body = components.find((component) => component.type === "BODY");
  const footer = components.find((component) => component.type === "FOOTER");
  const buttons = components.find((component) => component.type === "BUTTONS");

  return (
    <section className="panel">
      <h2>Template preview</h2>
      <div className="phone-preview">
        {header?.type === "HEADER" && <div className="preview-header">{highlightPlaceholders(header.text ?? "")}</div>}
        {body?.type === "BODY" && <div className="preview-body">{highlightPlaceholders(body.text)}</div>}
        {footer?.type === "FOOTER" && <div className="preview-footer">{highlightPlaceholders(footer.text)}</div>}
        {buttons?.type === "BUTTONS" && (
          <div className="preview-buttons">
            {buttons.buttons.map((button, index) => (
              <div className="preview-button" key={index}>
                {"text" in button ? button.text : `Copiar ${button.example}`}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function highlightPlaceholders(text: string) {
  const parts = text.split(/(\{\{\d+\}\})/g);
  return parts.map((part, index) =>
    /^\{\{\d+\}\}$/.test(part) ? <mark key={index}>{part}</mark> : <React.Fragment key={index}>{part}</React.Fragment>
  );
}

function IssueList({ title, items, tone, compact = false }: { title: string; items: string[]; tone: "danger" | "warning" | "neutral"; compact?: boolean }) {
  const cleanItems = Array.from(new Set(items.filter(Boolean)));
  if (cleanItems.length === 0 && compact) return null;

  return (
    <section className={`panel issue-panel ${tone}`}>
      <h2>{title}</h2>
      {cleanItems.length === 0 ? <p className="muted">Nenhum item.</p> : (
        <ul>
          {cleanItems.slice(0, 8).map((item, index) => <li key={index}>{item}</li>)}
        </ul>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function EmptyState() {
  return (
    <section className="panel empty-state">
      <h2>Nenhum draft ainda</h2>
      <p>Gere um template para ver auditoria, policy review e preview estruturado.</p>
    </section>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
