import type { TemplateCategory } from "./enums.js";
import type { CampaignIntent } from "./campaign-intent.model.js";

export const CommunicationObjective = {
  Notify: "NOTIFY",
  Remind: "REMIND",
  Confirm: "CONFIRM",
  Promote: "PROMOTE",
  Educate: "EDUCATE",
  Authenticate: "AUTHENTICATE",
  CollectResponse: "COLLECT_RESPONSE",
  Support: "SUPPORT",
} as const;

export type CommunicationObjective =
  (typeof CommunicationObjective)[keyof typeof CommunicationObjective];

export const CtaStrategyType = {
  None: "NONE",
  QuickReply: "QUICK_REPLY",
  VisitUrl: "VISIT_URL",
  CallPhone: "CALL_PHONE",
  CopyCode: "COPY_CODE",
  ReplyPrompt: "REPLY_PROMPT",
} as const;

export type CtaStrategyType =
  (typeof CtaStrategyType)[keyof typeof CtaStrategyType];

export const MediaStrategyType = {
  None: "NONE",
  TextHeader: "TEXT_HEADER",
  Image: "IMAGE",
  Video: "VIDEO",
  Document: "DOCUMENT",
} as const;

export type MediaStrategyType =
  (typeof MediaStrategyType)[keyof typeof MediaStrategyType];

export const PersonalizationLevel = {
  None: "NONE",
  Basic: "BASIC",
  Contextual: "CONTEXTUAL",
  High: "HIGH",
} as const;

export type PersonalizationLevel =
  (typeof PersonalizationLevel)[keyof typeof PersonalizationLevel];

export const CommunicationRiskLevel = {
  Low: "LOW",
  Medium: "MEDIUM",
  High: "HIGH",
  Critical: "CRITICAL",
} as const;

export type CommunicationRiskLevel =
  (typeof CommunicationRiskLevel)[keyof typeof CommunicationRiskLevel];

export const StrategyConfidence = {
  Low: "LOW",
  Medium: "MEDIUM",
  High: "HIGH",
} as const;

export type StrategyConfidence =
  (typeof StrategyConfidence)[keyof typeof StrategyConfidence];

export interface CommunicationStrategy {
  id: string;
  campaignIntent: CampaignIntent;
  objective: CommunicationObjective;
  recommendedCategory: TemplateCategory;
  cta: CtaStrategy;
  media: MediaStrategy;
  personalization: PersonalizationStrategy;
  risk: RiskStrategy;
  messageStructure: MessageStructureStrategy;
  constraints: StrategyConstraint[];
  rationale: string[];
  confidence: StrategyConfidence;
}

export interface CtaStrategy {
  type: CtaStrategyType;
  required: boolean;
  labelHint?: string;
  targetHint?: string;
  rationale: string;
}

export interface MediaStrategy {
  type: MediaStrategyType;
  required: boolean;
  rationale: string;
}

export interface PersonalizationStrategy {
  level: PersonalizationLevel;
  suggestedVariables: StrategyVariable[];
  rationale: string;
}

export interface StrategyVariable {
  name: string;
  description: string;
  example: string;
  required: boolean;
}

export interface RiskStrategy {
  level: CommunicationRiskLevel;
  reasons: string[];
  mitigationHints: string[];
}

export interface MessageStructureStrategy {
  includeHeader: boolean;
  includeFooter: boolean;
  includeButtons: boolean;
  primaryMessageRole: string;
  supportingMessageRoles: string[];
}

export interface StrategyConstraint {
  id: string;
  source: "business_context" | "channel_policy" | "system";
  severity: "block" | "warn";
  description: string;
}
