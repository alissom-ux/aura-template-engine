import {
  ButtonType,
  HeaderFormat,
  TemplateCategory,
  TemplateComponentType,
  ValidationSeverity,
} from "./enums.js";
import type {
  BodyComponent,
  ButtonsComponent,
  HeaderComponent,
  TemplateButton,
  TemplateComponent,
  WhatsAppTemplate,
} from "./template.model.js";

export interface ValidationIssue {
  code: string;
  message: string;
  severity: typeof ValidationSeverity.Error | typeof ValidationSeverity.Warning;
  path?: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

export const TEMPLATE_LIMITS = {
  templateName: 512,
  headerText: 60,
  bodyText: 1024,
  footerText: 60,
  buttonText: 25,
  totalButtons: 3,
  quickReplyButtons: 3,
  urlButtons: 2,
  phoneNumberButtons: 1,
  copyCodeButtons: 1,
} as const;

export function validateSemanticTemplate(
  template: Pick<WhatsAppTemplate, "name" | "category" | "components">
): ValidationResult {
  const issues: ValidationIssue[] = [
    ...validateTemplateName(template.name),
    ...validateComponentShape(template.components),
    ...validateVariables(template.components),
    ...validateButtonRules(template.components, template.category),
    ...validateCategoryRules(template.components, template.category),
  ];

  return {
    valid: issues.every((issue) => issue.severity !== ValidationSeverity.Error),
    issues,
  };
}

export function validateTemplateName(name: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!/^[a-z0-9_]+$/.test(name)) {
    issues.push(error("template.name.invalid", "Template name must be snake_case.", "name"));
  }

  if (name.length > TEMPLATE_LIMITS.templateName) {
    issues.push(error("template.name.too_long", "Template name exceeds 512 characters.", "name"));
  }

  return issues;
}

export function extractVariableIndexes(text: string): number[] {
  const matches = text.matchAll(/\{\{(\d+)\}\}/g);
  return [...matches].map((match) => Number(match[1]));
}

export function hasSequentialVariables(text: string): boolean {
  const uniqueIndexes = [...new Set(extractVariableIndexes(text))].sort((a, b) => a - b);
  return uniqueIndexes.every((value, index) => value === index + 1);
}

function validateComponentShape(components: TemplateComponent[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const bodyComponents = components.filter(isBodyComponent);

  if (bodyComponents.length !== 1) {
    issues.push(error(
      "components.body.required",
      "Template must contain exactly one BODY component.",
      "components"
    ));
  }

  for (const [index, component] of components.entries()) {
    const path = `components.${index}`;
    if (component.type === TemplateComponentType.Body && component.text.length > TEMPLATE_LIMITS.bodyText) {
      issues.push(error("body.text.too_long", "BODY text exceeds 1024 characters.", `${path}.text`));
    }
    if (component.type === TemplateComponentType.Header && component.text && component.text.length > TEMPLATE_LIMITS.headerText) {
      issues.push(error("header.text.too_long", "HEADER text exceeds 60 characters.", `${path}.text`));
    }
    if (component.type === TemplateComponentType.Footer && component.text.length > TEMPLATE_LIMITS.footerText) {
      issues.push(error("footer.text.too_long", "FOOTER text exceeds 60 characters.", `${path}.text`));
    }
  }

  return issues;
}

function validateVariables(components: TemplateComponent[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const [index, component] of components.entries()) {
    const text = getComponentText(component);
    if (!text) continue;

    if (!hasSequentialVariables(text)) {
      issues.push(error(
        "variables.sequence.invalid",
        "Template variables must be sequential, starting at {{1}}.",
        `components.${index}.text`
      ));
    }

    if (component.type === TemplateComponentType.Body) {
      const variableCount = new Set(extractVariableIndexes(component.text)).size;
      const exampleCount = component.example?.body_text?.[0]?.length ?? 0;
      if (variableCount > 0 && exampleCount < variableCount) {
        issues.push(error(
          "variables.examples.missing",
          "BODY variables require matching example values.",
          `components.${index}.example.body_text`
        ));
      }
    }
  }

  return issues;
}

function validateButtonRules(
  components: TemplateComponent[],
  category: WhatsAppTemplate["category"]
): ValidationIssue[] {
  const buttons = components.find(isButtonsComponent)?.buttons ?? [];
  const issues: ValidationIssue[] = [];

  if (buttons.length > TEMPLATE_LIMITS.totalButtons) {
    issues.push(error("buttons.too_many", "Template cannot have more than 3 buttons.", "components.BUTTONS.buttons"));
  }

  const quickReplies = buttons.filter((button) => button.type === ButtonType.QuickReply);
  const urlButtons = buttons.filter((button) => button.type === ButtonType.Url);
  const phoneButtons = buttons.filter((button) => button.type === ButtonType.PhoneNumber);
  const copyCodeButtons = buttons.filter((button) => button.type === ButtonType.CopyCode);
  const actionButtons = [...urlButtons, ...phoneButtons];

  if (quickReplies.length > 0 && actionButtons.length > 0) {
    issues.push(error("buttons.mixed_types", "QUICK_REPLY buttons cannot be mixed with URL or PHONE_NUMBER buttons.", "components.BUTTONS.buttons"));
  }
  if (quickReplies.length > TEMPLATE_LIMITS.quickReplyButtons) {
    issues.push(error("buttons.quick_reply.too_many", "Template cannot have more than 3 QUICK_REPLY buttons.", "components.BUTTONS.buttons"));
  }
  if (urlButtons.length > TEMPLATE_LIMITS.urlButtons) {
    issues.push(error("buttons.url.too_many", "Template cannot have more than 2 URL buttons.", "components.BUTTONS.buttons"));
  }
  if (phoneButtons.length > TEMPLATE_LIMITS.phoneNumberButtons) {
    issues.push(error("buttons.phone.too_many", "Template cannot have more than 1 PHONE_NUMBER button.", "components.BUTTONS.buttons"));
  }
  if (copyCodeButtons.length > TEMPLATE_LIMITS.copyCodeButtons) {
    issues.push(error("buttons.copy_code.too_many", "Template cannot have more than 1 COPY_CODE button.", "components.BUTTONS.buttons"));
  }
  if (category !== TemplateCategory.Authentication && copyCodeButtons.length > 0) {
    issues.push(error("buttons.copy_code.category", "COPY_CODE button is only allowed for AUTHENTICATION templates.", "components.BUTTONS.buttons"));
  }

  for (const [index, button] of buttons.entries()) {
    if (hasButtonText(button) && button.text.length > TEMPLATE_LIMITS.buttonText) {
      issues.push(error("button.text.too_long", "Button text exceeds 25 characters.", `components.BUTTONS.buttons.${index}.text`));
    }
  }

  return issues;
}

function validateCategoryRules(
  components: TemplateComponent[],
  category: WhatsAppTemplate["category"]
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (category !== TemplateCategory.Authentication) {
    return issues;
  }

  const header = components.find(isHeaderComponent);
  if (header && header.format !== HeaderFormat.Text) {
    issues.push(error("authentication.header.media", "AUTHENTICATION templates cannot use media headers.", "components.HEADER.format"));
  }

  const buttons = components.find(isButtonsComponent)?.buttons ?? [];
  if (buttons.some((button) => button.type !== ButtonType.CopyCode)) {
    issues.push(error("authentication.buttons.invalid", "AUTHENTICATION templates only allow COPY_CODE buttons.", "components.BUTTONS.buttons"));
  }

  return issues;
}

function getComponentText(component: TemplateComponent): string | undefined {
  if (component.type === TemplateComponentType.Body) return component.text;
  if (component.type === TemplateComponentType.Header) return component.text;
  if (component.type === TemplateComponentType.Footer) return component.text;
  return undefined;
}

function isBodyComponent(component: TemplateComponent): component is BodyComponent {
  return component.type === TemplateComponentType.Body;
}

function isHeaderComponent(component: TemplateComponent): component is HeaderComponent {
  return component.type === TemplateComponentType.Header;
}

function isButtonsComponent(component: TemplateComponent): component is ButtonsComponent {
  return component.type === TemplateComponentType.Buttons;
}

function hasButtonText(button: TemplateButton): button is Extract<TemplateButton, { text: string }> {
  return "text" in button;
}

function error(code: string, message: string, path?: string): ValidationIssue {
  return { code, message, path, severity: ValidationSeverity.Error };
}
