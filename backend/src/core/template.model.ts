import type {
  AgentType,
  AuditStatus,
  HeaderFormat,
  SemanticComponentRole,
  TemplateCategory,
  TemplateStatus,
} from "./enums.js";

export interface WhatsAppTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  language: string;
  status: TemplateStatus;
  components: TemplateComponent[];
  businessContextId: string;
  semanticModel?: SemanticTemplateModel;
  variables?: TemplateVariable[];
  metaTemplateId?: string;
  auditLog: AuditEntry[];
  createdAt: string;
  updatedAt: string;
}

export type TemplateComponent =
  | HeaderComponent
  | BodyComponent
  | FooterComponent
  | ButtonsComponent;

export interface HeaderComponent {
  type: "HEADER";
  format: HeaderFormat;
  text?: string;
  example?: { header_handle?: string[] };
}

export interface BodyComponent {
  type: "BODY";
  text: string;
  example?: { body_text: string[][] };
}

export interface FooterComponent {
  type: "FOOTER";
  text: string;
}

export interface ButtonsComponent {
  type: "BUTTONS";
  buttons: TemplateButton[];
}

export type TemplateButton =
  | QuickReplyButton
  | UrlButton
  | PhoneButton
  | CopyCodeButton;

export interface QuickReplyButton {
  type: "QUICK_REPLY";
  text: string;
}

export interface UrlButton {
  type: "URL";
  text: string;
  url: string;
  example?: string[];
}

export interface PhoneButton {
  type: "PHONE_NUMBER";
  text: string;
  phone_number: string;
}

export interface CopyCodeButton {
  type: "COPY_CODE";
  example: string;
}

export interface TemplateVariable {
  index: number;
  name: string;
  description: string;
  example: string;
  required: boolean;
  source?: "user" | "business_context" | "agent" | "system";
}

export interface SemanticTemplateModel {
  intent: TemplateIntent;
  message: SemanticMessage;
  variableBindings: SemanticVariableBinding[];
  constraints: SemanticConstraint[];
}

export interface TemplateIntent {
  rawInput: string;
  normalizedGoal: string;
  category: TemplateCategory;
  language: string;
  businessContextId: string;
}

export interface SemanticMessage {
  objective: string;
  audienceDescription?: string;
  components: SemanticComponent[];
}

export interface SemanticComponent {
  id: string;
  role: SemanticComponentRole;
  componentType: TemplateComponent["type"];
  text?: string;
  required: boolean;
  notes?: string;
}

export interface SemanticVariableBinding {
  variable: TemplateVariable;
  appearsIn: Array<TemplateComponent["type"]>;
  semanticPurpose: string;
}

export interface SemanticConstraint {
  id: string;
  source: "meta_policy" | "business_policy" | "system" | "agent";
  description: string;
  severity: "block" | "warn";
}

export interface AuditEntry {
  timestamp: string;
  agent: AgentType;
  status: AuditStatus;
  message: string;
  details?: Record<string, unknown>;
}

export type ActionButtonType =
  | "URL"
  | "PHONE_NUMBER";
