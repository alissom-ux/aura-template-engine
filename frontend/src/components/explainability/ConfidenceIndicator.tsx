export function ConfidenceIndicator({ value }: { value?: number }) {
  const confidence = resolveConfidence(value);

  return (
    <span className={`confidence-indicator ${confidence.tone}`}>
      {confidence.label}
    </span>
  );
}

function resolveConfidence(value?: number) {
  if (typeof value !== "number") return { label: "Confianca media", tone: "medium" };
  if (value >= 0.78) return { label: "Alta confianca", tone: "high" };
  if (value >= 0.55) return { label: "Confianca media", tone: "medium" };
  return { label: "Baixa confianca", tone: "low" };
}
