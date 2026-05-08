import type {
  BusinessExampleType,
  BusinessPolicySeverity,
  TonePrimary,
} from "./enums.js";

export interface BusinessContext {
  id: string;
  name: string;
  segment: string;
  description: string;
  tone: ToneOfVoice;
  audience: AudienceProfile;
  policies: BusinessPolicy[];
  examples: BusinessExample[];
  complianceNotes?: string;
  metaWabaId?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ToneOfVoice {
  primary: TonePrimary;
  avoid: string[];
  guidelines: string;
}

export interface AudienceProfile {
  description: string;
  ageRange?: string;
  painPoints: string[];
  expectations: string[];
}

export interface BusinessPolicy {
  id: string;
  rule: string;
  reason?: string;
  severity: BusinessPolicySeverity;
}

export interface BusinessExample {
  type: BusinessExampleType;
  content: string;
  notes?: string;
}
