interface IssueListProps {
  title: string;
  items: string[];
  tone: "danger" | "warning" | "neutral";
  compact?: boolean;
}

export function IssueList({ title, items, tone, compact = false }: IssueListProps) {
  const cleanItems = Array.from(new Set(items.filter(Boolean)));
  if (cleanItems.length === 0 && compact) return null;

  return (
    <section className={`panel issue-panel ${tone}`}>
      <h2>{title}</h2>
      {cleanItems.length === 0 ? (
        <p className="muted">Nenhum item.</p>
      ) : (
        <ul>
          {cleanItems.slice(0, 8).map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
