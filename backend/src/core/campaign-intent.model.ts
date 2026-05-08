import type { TemplateCategory } from "./enums.js";

export const CampaignIntentSource = {
  UserPrompt: "user_prompt",
  ImportedBrief: "imported_brief",
  Automation: "automation",
  AgentRevision: "agent_revision",
} as const;

export type CampaignIntentSource =
  (typeof CampaignIntentSource)[keyof typeof CampaignIntentSource];

export const CampaignLifecycleStage = {
  Acquisition: "ACQUISITION",
  Activation: "ACTIVATION",
  Transactional: "TRANSACTIONAL",
  Retention: "RETENTION",
  Reactivation: "REACTIVATION",
  Support: "SUPPORT",
  Authentication: "AUTHENTICATION",
  Unknown: "UNKNOWN",
} as const;

export type CampaignLifecycleStage =
  (typeof CampaignLifecycleStage)[keyof typeof CampaignLifecycleStage];

export const CampaignUrgency = {
  Low: "LOW",
  Normal: "NORMAL",
  High: "HIGH",
  TimeSensitive: "TIME_SENSITIVE",
} as const;

export type CampaignUrgency =
  (typeof CampaignUrgency)[keyof typeof CampaignUrgency];

export interface CampaignIntentInput {
  rawIntent: string;
  businessContextId: string;
  requestedCategory?: TemplateCategory;
  language?: string;
  source?: CampaignIntentSource;
}

export interface CampaignIntent {
  id: string;
  rawIntent: string;
  normalizedGoal: string;
  businessContextId: string;
  requestedCategory?: TemplateCategory;
  language: string;
  source: CampaignIntentSource;
  lifecycleStage: CampaignLifecycleStage;
  urgency: CampaignUrgency;
  desiredOutcome: string;
  audienceHint?: string;
  explicitConstraints: string[];
  detectedKeywords: string[];
}
