import { useMemo, useState } from "react";
import type { AuditReport, PolicyReview, TemplateComponent } from "../../types/pipeline";
import type { PreviewHighlightTarget, PreviewMode } from "../../types/preview";
import { WhatsAppMessageBubble } from "./WhatsAppMessageBubble";

interface WhatsAppPreviewProps {
  components: TemplateComponent[];
  category?: string;
  language?: string;
  policyReview?: PolicyReview;
  auditReport?: AuditReport;
  selectedTarget?: PreviewHighlightTarget | null;
  onSelectTarget?: (target: PreviewHighlightTarget | null) => void;
}

export function WhatsAppPreview({
  components,
  category = "MARKETING",
  language = "pt_BR",
  policyReview,
  auditReport,
  selectedTarget,
  onSelectTarget,
}: WhatsAppPreviewProps) {
  const [mode, setMode] = useState<PreviewMode>("placeholders");
  const header = components.find((component) => component.type === "HEADER");
  const body = components.find((component) => component.type === "BODY");
  const footer = components.find((component) => component.type === "FOOTER");
  const buttons = components.find((component) => component.type === "BUTTONS");
  const examples = extractExamples(body);
  const bodyText = body?.type === "BODY" ? body.text : "";
  const variables = useMemo(() => extractVariables(components), [components]);
  const status = resolvePreviewStatus({ components, variables, examples, policyReview, auditReport });

  return (
    <section className={`panel preview-panel ${status.tone}`}>
      <div className="panel-heading">
        <div>
          <h2>WhatsApp preview</h2>
          <p className="muted">Visual operacional do template como o contato deve receber.</p>
        </div>
        <span className={`preview-status ${status.tone}`}>{status.label}</span>
      </div>

      <div className="preview-meta-row">
        <PreviewMeta label="Categoria" value={category} />
        <PreviewMeta label="Idioma" value={language} />
        <PreviewMeta label="Caracteres" value={String(bodyText.length)} />
        <PreviewMeta label="Variaveis" value={String(variables.length)} />
      </div>

      <div className="preview-controls">
        <button
          className={mode === "placeholders" ? "mode-button active" : "mode-button"}
          onClick={() => setMode("placeholders")}
          type="button"
        >
          Placeholders
        </button>
        <button
          className={mode === "example" ? "mode-button active" : "mode-button"}
          onClick={() => setMode("example")}
          type="button"
        >
          Exemplo preenchido
        </button>
      </div>

      {variables.length > 0 && (
        <div className="variable-strip" aria-label="Variaveis do template">
          {variables.map((variable) => (
            <button
              className={`variable-chip ${selectedTarget?.value === variable ? "selected" : ""}`}
              key={variable}
              onClick={() => onSelectTarget?.({ kind: "variable", value: variable })}
              type="button"
            >
              {variable}
            </button>
          ))}
        </div>
      )}

      <div className="wa-device-frame">
        <div className="wa-device-header">
          <div className="wa-avatar">A</div>
          <div>
            <strong>Aura Preview</strong>
            <span>template message</span>
          </div>
        </div>

        <div className="wa-chat-wallpaper">
          {components.length === 0 ? (
            <div className="wa-empty-message">O template aparece aqui assim que o copiloto gerar o draft.</div>
          ) : (
            <WhatsAppMessageBubble
              header={header?.type === "HEADER" ? header : undefined}
              body={body?.type === "BODY" ? body : undefined}
              footer={footer?.type === "FOOTER" ? footer : undefined}
              buttons={buttons?.type === "BUTTONS" ? buttons : undefined}
              mode={mode}
              examples={examples}
              selectedTarget={selectedTarget}
              onSelectTarget={(target) => onSelectTarget?.(target)}
            />
          )}
        </div>
      </div>
    </section>
  );
}

function PreviewMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="preview-meta">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function extractExamples(body?: TemplateComponent) {
  if (body?.type !== "BODY") return [];
  return body.example?.body_text?.[0] ?? [];
}

function extractVariables(components: TemplateComponent[]) {
  const text = components
    .map((component) => {
      if (component.type === "HEADER") return component.text ?? "";
      if (component.type === "BODY") return component.text;
      if (component.type === "FOOTER") return component.text;
      return "";
    })
    .join(" ");

  return Array.from(new Set(text.match(/\{\{\d+\}\}/g) ?? []));
}

function resolvePreviewStatus({
  components,
  variables,
  examples,
  policyReview,
  auditReport,
}: {
  components: TemplateComponent[];
  variables: string[];
  examples: string[];
  policyReview?: PolicyReview;
  auditReport?: AuditReport;
}) {
  if (components.length === 0) return { label: "Aguardando", tone: "idle" };
  if (variables.length > examples.length) return { label: "Faltam exemplos", tone: "warning" };
  if (policyReview?.violations.length || auditReport?.blockingIssues.length) return { label: "Precisa ajuste", tone: "danger" };
  if (policyReview?.warnings.length || auditReport?.warnings.length) return { label: "Risco moderado", tone: "warning" };
  if (auditReport?.status === "READY_FOR_REVIEW") return { label: "Pronto para revisao", tone: "ok" };
  return { label: "Preview valido", tone: "ok" };
}
