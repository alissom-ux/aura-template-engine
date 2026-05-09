import type { ConversationState } from "../../types/experience";

const defaultActions = [
  "reduzir risco",
  "tom mais acolhedor",
  "CTA mais forte",
  "explicar bloqueios",
];

export function SuggestedActions({ state }: { state: ConversationState }) {
  return (
    <section className="suggested-actions">
      <div>
        <h2>Acoes rapidas</h2>
        <p className="muted">Preparadas para a camada conversacional futura.</p>
      </div>
      <div className="quick-action-grid">
        {defaultActions.map((action) => (
          <button className="secondary-button" disabled={state === "generating"} key={action} type="button">
            {action}
          </button>
        ))}
      </div>
    </section>
  );
}
