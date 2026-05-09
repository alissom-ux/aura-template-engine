import type { CopywriterOutput, PolicyReviewResult } from "../types/index.js";

const SPAM_TERMS = ["urgente", "ultima chance", "corra", "imperdivel", "garantido", "sem risco"];

export class PolicyReviewerAgent {
  async run(input: { copy: CopywriterOutput; businessContextId: string }): Promise<PolicyReviewResult> {
    const text = collectText(input.copy.components);
    const violations = SPAM_TERMS
      .filter((term) => normalize(text).includes(normalize(term)))
      .map((term) => ({
        severity: term === "garantido" || term === "sem risco" ? "block" as const : "warn" as const,
        rule: "Avoid spam pressure, artificial urgency, or unsupported claims in WhatsApp templates.",
        affectedText: term,
        suggestion: `Replace "${term}" with neutral, factual wording.`,
      }));

    return {
      approved: violations.every((violation) => violation.severity !== "block"),
      violations: violations.filter((violation) => violation.severity === "block"),
      warnings: violations.filter((violation) => violation.severity === "warn"),
      suggestions: violations.map((violation) => violation.suggestion),
    };
  }
}

function collectText(components: CopywriterOutput["components"]): string {
  return components.map((component) => {
    if (component.type === "BODY" || component.type === "HEADER" || component.type === "FOOTER") return component.text ?? "";
    return component.buttons.map((button) => "text" in button ? button.text : button.example).join(" ");
  }).join(" ");
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
