interface MetaPolicyExplanationProps {
  rule: string;
  interpretation: string;
  impact: string;
}

export function MetaPolicyExplanation({ rule, interpretation, impact }: MetaPolicyExplanationProps) {
  return (
    <article className="explain-card policy-card">
      <h3>Politica Meta considerada</h3>
      <p className="policy-rule">{rule}</p>
      <div className="why-block">
        <span>Leitura do copiloto</span>
        <p>{interpretation}</p>
      </div>
      <div className="why-block">
        <span>Why this matters</span>
        <p>{impact}</p>
      </div>
    </article>
  );
}
