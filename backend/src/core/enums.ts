export const TemplateCategory = {
  Marketing: "MARKETING",
  Utility: "UTILITY",
  Authentication: "AUTHENTICATION",
} as const;

export type TemplateCategory =
  (typeof TemplateCategory)[keyof typeof TemplateCategory];

export const TemplateStatus = {
  Draft: "DRAFT",
  PendingReview: "PENDING_REVIEW",
  ApprovedInternal: "APPROVED_INTERNAL",
  RejectedInternal: "REJECTED_INTERNAL",
  PendingMeta: "PENDING_META",
  Approved: "APPROVED",
  Rejected: "REJECTED",
  Paused: "PAUSED",
  Archived: "ARCHIVED",
} as const;

export type TemplateStatus = (typeof TemplateStatus)[keyof typeof TemplateStatus];

export const TemplateComponentType = {
  Header: "HEADER",
  Body: "BODY",
  Footer: "FOOTER",
  Buttons: "BUTTONS",
} as const;

export type TemplateComponentType =
  (typeof TemplateComponentType)[keyof typeof TemplateComponentType];

export const HeaderFormat = {
  Text: "TEXT",
  Image: "IMAGE",
  Video: "VIDEO",
  Document: "DOCUMENT",
} as const;

export type HeaderFormat = (typeof HeaderFormat)[keyof typeof HeaderFormat];

export const ButtonType = {
  QuickReply: "QUICK_REPLY",
  Url: "URL",
  PhoneNumber: "PHONE_NUMBER",
  CopyCode: "COPY_CODE",
} as const;

export type ButtonType = (typeof ButtonType)[keyof typeof ButtonType];

export const AgentType = {
  Strategist: "strategist",
  Copywriter: "copywriter",
  PolicyReviewer: "policy_reviewer",
  Compiler: "compiler",
  Auditor: "auditor",
} as const;

export type AgentType = (typeof AgentType)[keyof typeof AgentType];

export const AuditStatus = {
  Pass: "PASS",
  Fail: "FAIL",
  Warning: "WARNING",
} as const;

export type AuditStatus = (typeof AuditStatus)[keyof typeof AuditStatus];

export const BusinessPolicySeverity = {
  Block: "block",
  Warn: "warn",
} as const;

export type BusinessPolicySeverity =
  (typeof BusinessPolicySeverity)[keyof typeof BusinessPolicySeverity];

export const TonePrimary = {
  Formal: "formal",
  Informal: "informal",
  Technical: "technical",
  Empathetic: "empathetic",
  Urgency: "urgency",
} as const;

export type TonePrimary = (typeof TonePrimary)[keyof typeof TonePrimary];

export const BusinessExampleType = {
  ApprovedTemplate: "approved_template",
  CommunicationSample: "communication_sample",
} as const;

export type BusinessExampleType =
  (typeof BusinessExampleType)[keyof typeof BusinessExampleType];

export const SemanticComponentRole = {
  BrandIdentification: "BRAND_IDENTIFICATION",
  MainMessage: "MAIN_MESSAGE",
  Context: "CONTEXT",
  Disclaimer: "DISCLAIMER",
  CallToAction: "CALL_TO_ACTION",
  UserChoice: "USER_CHOICE",
  SecurityCode: "SECURITY_CODE",
} as const;

export type SemanticComponentRole =
  (typeof SemanticComponentRole)[keyof typeof SemanticComponentRole];

export const ValidationSeverity = {
  Error: "error",
  Warning: "warning",
} as const;

export type ValidationSeverity =
  (typeof ValidationSeverity)[keyof typeof ValidationSeverity];
