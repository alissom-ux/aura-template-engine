import { ConfidenceIndicator } from "./ConfidenceIndicator";

interface RecommendationCardProps {
  title: string;
  recommendation: string;
  why: string;
  confidence?: number;
}

export function RecommendationCard({ title, recommendation, why, confidence }: RecommendationCardProps) {
  return (
    <article className="explain-card recommendation-card">
      <div className="explain-card-heading">
        <h3>{title}</h3>
        <ConfidenceIndicator value={confidence} />
      </div>
      <p className="recommendation-text">{recommendation}</p>
      <div className="why-block">
        <span>Why this matters</span>
        <p>{why}</p>
      </div>
    </article>
  );
}
