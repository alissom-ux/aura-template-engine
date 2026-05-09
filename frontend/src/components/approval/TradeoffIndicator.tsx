interface TradeoffIndicatorProps {
  label: string;
  tone: "safe" | "balanced" | "aggressive";
}

export function TradeoffIndicator({ label, tone }: TradeoffIndicatorProps) {
  return <span className={`tradeoff-indicator ${tone}`}>{label}</span>;
}
