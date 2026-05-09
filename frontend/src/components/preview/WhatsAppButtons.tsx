import type { TemplateButton } from "../../types/pipeline";

export function WhatsAppButtons({ buttons }: { buttons: TemplateButton[] }) {
  if (buttons.length === 0) return null;

  return (
    <div className="wa-buttons">
      {buttons.map((button, index) => (
        <button className="wa-button" key={index} type="button">
          <span>{buttonLabel(button)}</span>
        </button>
      ))}
    </div>
  );
}

function buttonLabel(button: TemplateButton) {
  if ("text" in button) return button.text;
  return `Copiar ${button.example}`;
}
