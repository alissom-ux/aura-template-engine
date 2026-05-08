import type { ApprovalDecision, ApprovalGate } from "./approval-decision.model.js";
import type { ReviewHistory } from "./review-history.model.js";
import type { ReviewSnapshot } from "./review-snapshot.model.js";

export const ReviewSessionStatus = {
  PendingReview: "PENDING_REVIEW",
  Approved: "APPROVED",
  Rejected: "REJECTED",
  ChangesRequested: "CHANGES_REQUESTED",
  Expired: "EXPIRED",
} as const;

export type ReviewSessionStatus =
  (typeof ReviewSessionStatus)[keyof typeof ReviewSessionStatus];

export interface ReviewSession {
  id: string;
  executionId: string;
  status: ReviewSessionStatus;
  currentSnapshot: ReviewSnapshot;
  version: number;
  approvalGate: ApprovalGate;
  decisions: ApprovalDecision[];
  history: ReviewHistory;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewSessionInput {
  executionId: string;
  snapshot: ReviewSnapshot;
}
