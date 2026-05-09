import type { ConversationState } from "../../types/experience";

interface TimelineStep {
  id: string;
  label: string;
}

const steps: TimelineStep[] = [
  { id: "intent", label: "Intencao" },
  { id: "strategy", label: "Estrategia" },
  { id: "copy", label: "Draft" },
  { id: "compliance", label: "Compliance" },
  { id: "review", label: "Revisao" },
];

export function CopilotTimeline({ state }: { state: ConversationState }) {
  const activeIndex = resolveActiveIndex(state);

  return (
    <section className="copilot-timeline" aria-label="Progresso operacional">
      {steps.map((step, index) => (
        <div className={`timeline-step ${index < activeIndex ? "done" : index === activeIndex ? "active" : ""}`} key={step.id}>
          <span>{index + 1}</span>
          <strong>{step.label}</strong>
        </div>
      ))}
    </section>
  );
}

function resolveActiveIndex(state: ConversationState) {
  if (state === "idle" || state === "collecting_intent") return 0;
  if (state === "generating") return 2;
  if (state === "blocked") return 3;
  if (state === "draft_ready") return 3;
  if (state === "review_ready") return 4;
  return 0;
}
