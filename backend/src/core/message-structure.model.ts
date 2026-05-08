import type { CtaStrategyType, MediaStrategyType } from "./communication-strategy.model.js";
import type { TemplateCategory } from "./enums.js";

export const MessageSectionType = {
  Opening: "OPENING",
  Context: "CONTEXT",
  MainMessage: "MAIN_MESSAGE",
  CallToAction: "CALL_TO_ACTION",
  Footer: "FOOTER",
  ButtonSet: "BUTTON_SET",
} as const;

export type MessageSectionType =
  (typeof MessageSectionType)[keyof typeof MessageSectionType];

export const MessageRealizationChannel = {
  WhatsAppTemplate: "WHATSAPP_TEMPLATE",
  GenericMessaging: "GENERIC_MESSAGING",
} as const;

export type MessageRealizationChannel =
  (typeof MessageRealizationChannel)[keyof typeof MessageRealizationChannel];

export interface MessageStructure {
  id: string;
  channel: MessageRealizationChannel;
  category: TemplateCategory;
  language: string;
  sections: MessageSection[];
  ctaType: CtaStrategyType;
  mediaType: MediaStrategyType;
  variablePlaceholders: MessageVariablePlaceholder[];
  warnings: string[];
}

export interface MessageSection {
  id: string;
  type: MessageSectionType;
  required: boolean;
  purpose: string;
  order: number;
}

export interface MessageVariablePlaceholder {
  index: number;
  name: string;
  token: string;
  example: string;
  required: boolean;
  description: string;
}
