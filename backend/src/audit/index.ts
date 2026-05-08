// Audit utilities — shared logic used by AuditorAgent and PolicyReviewerAgent

import type { AuditEntry, AgentType } from "../types/index.js";

export function createAuditEntry(
  agent: AgentType,
  status: AuditEntry["status"],
  message: string,
  details?: Record<string, unknown>
): AuditEntry {
  return {
    timestamp: new Date().toISOString(),
    agent,
    status,
    message,
    details,
  };
}

export function scoreToApprovalProbability(score: number): "HIGH" | "MEDIUM" | "LOW" | "VERY_LOW" {
  if (score >= 80) return "HIGH";
  if (score >= 60) return "MEDIUM";
  if (score >= 40) return "LOW";
  return "VERY_LOW";
}
