import type { TemplateComponent } from "../../types/pipeline";
import type { PreviewMode, PreviewHighlightTarget } from "../../types/preview";
import { WhatsAppBodyBlock } from "./WhatsAppBodyBlock";
import { WhatsAppButtons } from "./WhatsAppButtons";
import { WhatsAppFooterBlock } from "./WhatsAppFooterBlock";
import { WhatsAppHeaderBlock } from "./WhatsAppHeaderBlock";

interface WhatsAppMessageBubbleProps {
  header?: Extract<TemplateComponent, { type: "HEADER" }>;
  body?: Extract<TemplateComponent, { type: "BODY" }>;
  footer?: Extract<TemplateComponent, { type: "FOOTER" }>;
  buttons?: Extract<TemplateComponent, { type: "BUTTONS" }>;
  mode: PreviewMode;
  examples: string[];
  selectedTarget?: PreviewHighlightTarget | null;
  onSelectTarget?: (target: PreviewHighlightTarget) => void;
}

export function WhatsAppMessageBubble({
  header,
  body,
  footer,
  buttons,
  mode,
  examples,
  selectedTarget,
  onSelectTarget,
}: WhatsAppMessageBubbleProps) {
  return (
    <div className="wa-message-wrap">
      <div className="wa-message-bubble">
        <WhatsAppHeaderBlock
          text={header?.text}
          mode={mode}
          examples={examples}
          selectedTarget={selectedTarget}
          onSelectTarget={onSelectTarget}
        />
        {body?.text ? (
          <WhatsAppBodyBlock
            text={body.text}
            mode={mode}
            examples={examples}
            selectedTarget={selectedTarget}
            onSelectTarget={onSelectTarget}
          />
        ) : null}
        <WhatsAppFooterBlock
          text={footer?.text}
          mode={mode}
          examples={examples}
          selectedTarget={selectedTarget}
          onSelectTarget={onSelectTarget}
        />
        <time>09:41</time>
      </div>
      <WhatsAppButtons buttons={buttons?.buttons ?? []} />
    </div>
  );
}
