import type { PreviewMode, PreviewHighlightTarget } from "../../types/preview";

interface PlaceholderHighlightProps {
  text: string;
  mode: PreviewMode;
  examples: string[];
  selectedTarget?: PreviewHighlightTarget | null;
  onSelectTarget?: (target: PreviewHighlightTarget) => void;
}

export function PlaceholderHighlight({
  text,
  mode,
  examples,
  selectedTarget,
  onSelectTarget,
}: PlaceholderHighlightProps) {
  const parts = text.split(/(\{\{\d+\}\})/g);

  return (
    <>
      {parts.map((part, index) => {
        const match = part.match(/^\{\{(\d+)\}\}$/);
        if (!match) {
          return renderTextPart(part, index, selectedTarget);
        }

        const variableIndex = Number(match[1]);
        const replacement = examples[variableIndex - 1] || fallbackExample(variableIndex);
        const displayValue = mode === "example" ? replacement : part;
        const selected = selectedTarget?.kind === "variable" && selectedTarget.value === part;

        return (
          <button
            className={`placeholder-token ${selected ? "selected" : ""}`}
            key={`${part}-${index}`}
            onClick={() => onSelectTarget?.({ kind: "variable", value: part })}
            type="button"
          >
            {displayValue}
          </button>
        );
      })}
    </>
  );
}

function renderTextPart(part: string, index: number, selectedTarget?: PreviewHighlightTarget | null) {
  if (!selectedTarget?.value || selectedTarget.kind === "variable") return part;

  const normalizedPart = part.toLowerCase();
  const normalizedTarget = selectedTarget.value.toLowerCase();
  const matchIndex = normalizedPart.indexOf(normalizedTarget);

  if (matchIndex < 0) return part;

  const before = part.slice(0, matchIndex);
  const match = part.slice(matchIndex, matchIndex + selectedTarget.value.length);
  const after = part.slice(matchIndex + selectedTarget.value.length);

  return (
    <span key={index}>
      {before}
      <span className="preview-text-highlight">{match}</span>
      {after}
    </span>
  );
}

function fallbackExample(index: number) {
  const examples = ["Ana", "quinta-feira", "10h30", "seu atendimento"];
  return examples[index - 1] ?? `exemplo ${index}`;
}
