interface SuggestedFixCardProps {
  title: string;
  fix: string;
  impact: string;
}

export function SuggestedFixCard({ title, fix, impact }: SuggestedFixCardProps) {
  return (
    <article className="suggested-fix-card">
      <h3>{title}</h3>
      <p>{fix}</p>
      <div className="why-block">
        <span>Impacto esperado</span>
        <p>{impact}</p>
      </div>
    </article>
  );
}
