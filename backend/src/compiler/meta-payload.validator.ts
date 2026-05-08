import { TemplateCategory } from "../core/index.js";
import type {
  MetaButton,
  MetaComponent,
  MetaPayloadValidationIssue,
  MetaPayloadValidationResult,
  MetaTemplatePayload,
} from "./meta-compiler.types.js";

export class MetaPayloadValidator {
  validate(payload: MetaTemplatePayload): MetaPayloadValidationResult {
    const errors: MetaPayloadValidationIssue[] = [];
    const warnings: MetaPayloadValidationIssue[] = [];

    if (!/^[a-z0-9_]+$/.test(payload.name)) {
      errors.push(issue("meta.name.invalid", "Template name must be snake_case.", "name"));
    }
    if (payload.name.length > 512) {
      errors.push(issue("meta.name.too_long", "Template name exceeds 512 characters.", "name"));
    }
    if (!Object.values(TemplateCategory).includes(payload.category)) {
      errors.push(issue("meta.category.invalid", "Template category is invalid.", "category"));
    }

    const bodyComponents = payload.components.filter((component) => component.type === "BODY");
    if (bodyComponents.length !== 1) {
      errors.push(issue("meta.body.required", "Meta payload must include exactly one BODY component.", "components"));
    }

    for (const [index, component] of payload.components.entries()) {
      validateComponent(component, index, errors, warnings, payload.category);
    }

    return { valid: errors.length === 0, warnings, errors };
  }
}

function validateComponent(
  component: MetaComponent,
  index: number,
  errors: MetaPayloadValidationIssue[],
  warnings: MetaPayloadValidationIssue[],
  category: MetaTemplatePayload["category"]
): void {
  const path = `components.${index}`;

  if (component.type === "HEADER") {
    if (component.format === "TEXT" && (!component.text || component.text.length === 0)) {
      errors.push(issue("meta.header.text_required", "TEXT header requires text.", `${path}.text`));
    }
    if (component.text && component.text.length > 60) {
      errors.push(issue("meta.header.too_long", "HEADER text exceeds 60 characters.", `${path}.text`));
    }
    if (category === TemplateCategory.Authentication && component.format !== "TEXT") {
      errors.push(issue("meta.authentication.header_media", "AUTHENTICATION cannot use media header.", `${path}.format`));
    }
  }

  if (component.type === "BODY") {
    if (component.text.length === 0 || component.text.length > 1024) {
      errors.push(issue("meta.body.length", "BODY text must be between 1 and 1024 characters.", `${path}.text`));
    }
    validateVariables(component.text, component.example?.body_text?.[0] ?? [], `${path}.example.body_text`, errors);
  }

  if (component.type === "FOOTER" && component.text.length > 60) {
    errors.push(issue("meta.footer.too_long", "FOOTER text exceeds 60 characters.", `${path}.text`));
  }

  if (component.type === "BUTTONS") {
    validateButtons(component.buttons, `${path}.buttons`, errors, warnings, category);
  }
}

function validateVariables(
  text: string,
  examples: string[],
  path: string,
  errors: MetaPayloadValidationIssue[]
): void {
  const indexes = [...new Set([...text.matchAll(/\{\{(\d+)\}\}/g)].map((match) => Number(match[1])))]
    .sort((a, b) => a - b);

  if (!indexes.every((value, index) => value === index + 1)) {
    errors.push(issue("meta.variables.sequence", "Variables must be sequential from {{1}}.", path));
  }
  if (examples.length < indexes.length) {
    errors.push(issue("meta.variables.examples_missing", "Each BODY variable requires an example.", path));
  }
}

function validateButtons(
  buttons: MetaButton[],
  path: string,
  errors: MetaPayloadValidationIssue[],
  warnings: MetaPayloadValidationIssue[],
  category: MetaTemplatePayload["category"]
): void {
  if (buttons.length > 3) {
    errors.push(issue("meta.buttons.too_many", "Meta allows at most 3 buttons.", path));
  }

  const quickReplies = buttons.filter((button) => button.type === "QUICK_REPLY");
  const actionButtons = buttons.filter((button) => button.type === "URL" || button.type === "PHONE_NUMBER");
  const urlButtons = buttons.filter((button) => button.type === "URL");
  const phoneButtons = buttons.filter((button) => button.type === "PHONE_NUMBER");
  const copyCodeButtons = buttons.filter((button) => button.type === "COPY_CODE");

  if (quickReplies.length > 0 && actionButtons.length > 0) {
    errors.push(issue("meta.buttons.mixed", "QUICK_REPLY cannot be mixed with URL or PHONE_NUMBER.", path));
  }
  if (urlButtons.length > 2) errors.push(issue("meta.buttons.url_limit", "At most 2 URL buttons are allowed.", path));
  if (phoneButtons.length > 1) errors.push(issue("meta.buttons.phone_limit", "At most 1 PHONE_NUMBER button is allowed.", path));
  if (copyCodeButtons.length > 1) errors.push(issue("meta.buttons.copy_code_limit", "At most 1 COPY_CODE button is allowed.", path));
  if (category !== TemplateCategory.Authentication && copyCodeButtons.length > 0) {
    errors.push(issue("meta.buttons.copy_code_category", "COPY_CODE is only allowed for AUTHENTICATION.", path));
  }

  for (const [index, button] of buttons.entries()) {
    if ("text" in button && button.text.length > 25) {
      errors.push(issue("meta.button.text_too_long", "Button text exceeds 25 characters.", `${path}.${index}.text`));
    }
  }

  if (buttons.length === 0) {
    warnings.push(issue("meta.buttons.empty", "BUTTONS component is empty.", path));
  }
}

function issue(code: string, message: string, path?: string): MetaPayloadValidationIssue {
  return { code, message, path };
}
