import type { PreviewMode, PreviewHighlightTarget } from "../../types/preview";
import { PlaceholderHighlight } from "./PlaceholderHighlight";

interface WhatsAppHeaderBlockProps {
  text?: string;
  mode: PreviewMode;
  examples: string[];
  selectedTarget?: PreviewHighlightTarget | null;
  onSelectTarget?: (target: PreviewHighlightTarget) => void;
}

export function WhatsAppHeaderBlock({ text, mode, examples, selectedTarget, onSelectTarget }: WhatsAppHeaderBlockProps) {
  if (!text) return null;

  return (
    <div className="wa-header-block">
      <span>Header</span>
      <strong>
        <PlaceholderHighlight
          text={text}
          mode={mode}
          examples={examples}
          selectedTarget={selectedTarget}
          onSelectTarget={onSelectTarget}
        />
      </strong>
    </div>
  );
}
