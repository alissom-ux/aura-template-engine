import type { DecisionTraceEntry, ExecutionArtifact, TemplateCategory } from "../core/index.js";

export interface MetaCompilerRequest {
  reviewSessionId: string;
  approvalToken: string;
}

export interface MetaCompiledTemplate {
  success: boolean;
  compiled: boolean;
  compileChecksum?: string;
  metaPayload?: MetaTemplatePayload;
  validation: MetaPayloadValidationResult;
  decisionTrace: DecisionTraceEntry[];
  artifacts: ExecutionArtifact[];
  error?: MetaCompilerError;
}

export interface MetaCompilerError {
  code: string;
  message: string;
  details?: unknown;
}

export interface MetaTemplatePayload {
  name: string;
  category: TemplateCategory;
  language: string;
  components: MetaComponent[];
}

export type MetaComponent =
  | MetaHeaderComponent
  | MetaBodyComponent
  | MetaFooterComponent
  | MetaButtonsComponent;

export interface MetaHeaderComponent {
  type: "HEADER";
  format: "TEXT" | "IMAGE" | "VIDEO" | "DOCUMENT";
  text?: string;
  example?: { header_handle?: string[] };
}

export interface MetaBodyComponent {
  type: "BODY";
  text: string;
  example?: { body_text: string[][] };
}

export interface MetaFooterComponent {
  type: "FOOTER";
  text: string;
}

export interface MetaButtonsComponent {
  type: "BUTTONS";
  buttons: MetaButton[];
}

export type MetaButton =
  | { type: "QUICK_REPLY"; text: string }
  | { type: "URL"; text: string; url: string; example?: string[] }
  | { type: "PHONE_NUMBER"; text: string; phone_number: string }
  | { type: "COPY_CODE"; example: string };

export interface MetaPayloadValidationResult {
  valid: boolean;
  warnings: MetaPayloadValidationIssue[];
  errors: MetaPayloadValidationIssue[];
}

export interface MetaPayloadValidationIssue {
  code: string;
  message: string;
  path?: string;
}
