import { ConfidenceIndicator } from "./ConfidenceIndicator";

interface RiskExplanationCardProps {
  level: string;
  reason: string;
  impact: string;
  confidence?: number;
}

export function RiskExplanationCard({ level, reason, impact, confidence }: RiskExplanationCardProps) {
  return (
    <article className={`explain-card risk-card ${riskTone(level)}`}>
      <div className="explain-card-heading">
        <h3>Risco operacional</h3>
        <ConfidenceIndicator value={confidence} />
      </div>
      <p className="risk-level">{level}</p>
      <p>{reason}</p>
      <div className="why-block">
        <span>Impacto operacional</span>
        <p>{impact}</p>
      </div>
    </article>
  );
}

function riskTone(level: string) {
  const normalized = level.toLowerCase();
  if (normalized.includes("critical") || normalized.includes("high")) return "danger";
  if (normalized.includes("medium") || normalized.includes("moderate")) return "warning";
  return "ok";
}
