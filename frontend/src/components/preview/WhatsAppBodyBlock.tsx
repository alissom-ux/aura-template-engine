import type { PreviewMode, PreviewHighlightTarget } from "../../types/preview";
import { PlaceholderHighlight } from "./PlaceholderHighlight";

interface WhatsAppBodyBlockProps {
  text: string;
  mode: PreviewMode;
  examples: string[];
  selectedTarget?: PreviewHighlightTarget | null;
  onSelectTarget?: (target: PreviewHighlightTarget) => void;
}

export function WhatsAppBodyBlock({ text, mode, examples, selectedTarget, onSelectTarget }: WhatsAppBodyBlockProps) {
  return (
    <div className="wa-body-block">
      <PlaceholderHighlight
        text={text}
        mode={mode}
        examples={examples}
        selectedTarget={selectedTarget}
        onSelectTarget={onSelectTarget}
      />
    </div>
  );
}
