import type { AgentType } from "./enums.js";

export const MemoryScope = {
  Execution: "EXECUTION",
  BusinessContext: "BUSINESS_CONTEXT",
  Global: "GLOBAL",
} as const;

export type MemoryScope = (typeof MemoryScope)[keyof typeof MemoryScope];

export const MemoryKind = {
  Observation: "OBSERVATION",
  Preference: "PREFERENCE",
  Constraint: "CONSTRAINT",
  Decision: "DECISION",
  Warning: "WARNING",
  Artifact: "ARTIFACT",
} as const;

export type MemoryKind = (typeof MemoryKind)[keyof typeof MemoryKind];

export interface AgentMemoryEntry {
  id: string;
  executionId?: string;
  businessContextId?: string;
  agent: AgentType;
  scope: MemoryScope;
  kind: MemoryKind;
  key: string;
  value: unknown;
  summary: string;
  tags: string[];
  createdAt: string;
  expiresAt?: string;
}

export interface AgentMemorySnapshot {
  executionId: string;
  entries: AgentMemoryEntry[];
}

export interface CreateAgentMemoryEntryInput {
  executionId?: string;
  businessContextId?: string;
  agent: AgentType;
  scope: MemoryScope;
  kind: MemoryKind;
  key: string;
  value: unknown;
  summary: string;
  tags?: string[];
  expiresAt?: string;
}
