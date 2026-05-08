import type { ApprovalDecision } from "./approval-decision.model.js";

export const ReviewHistoryEventType = {
  SessionCreated: "SESSION_CREATED",
  SnapshotCreated: "SNAPSHOT_CREATED",
  Approved: "APPROVED",
  Rejected: "REJECTED",
  ChangesRequested: "CHANGES_REQUESTED",
  GateEvaluated: "GATE_EVALUATED",
} as const;

export type ReviewHistoryEventType =
  (typeof ReviewHistoryEventType)[keyof typeof ReviewHistoryEventType];

export interface ReviewHistoryEvent {
  id: string;
  reviewSessionId: string;
  type: ReviewHistoryEventType;
  message: string;
  decision?: ApprovalDecision;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface ReviewHistory {
  reviewSessionId: string;
  events: ReviewHistoryEvent[];
}
