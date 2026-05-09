import type { PreviewMode, PreviewHighlightTarget } from "../../types/preview";
import { PlaceholderHighlight } from "./PlaceholderHighlight";

interface WhatsAppFooterBlockProps {
  text?: string;
  mode: PreviewMode;
  examples: string[];
  selectedTarget?: PreviewHighlightTarget | null;
  onSelectTarget?: (target: PreviewHighlightTarget) => void;
}

export function WhatsAppFooterBlock({ text, mode, examples, selectedTarget, onSelectTarget }: WhatsAppFooterBlockProps) {
  if (!text) return null;

  return (
    <div className="wa-footer-block">
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
