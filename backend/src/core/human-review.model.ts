import type { ApprovalGate } from "./approval-decision.model.js";
import type { ReviewSessionStatus } from "./review-session.model.js";

export interface HumanReviewState {
  required: true;
  status: ReviewSessionStatus;
  reviewSessionId: string;
  snapshotId: string;
  snapshotVersion: number;
  snapshotHash: string;
  approvalGate: ApprovalGate;
  nextAction: "approve" | "reject" | "request_changes";
}

export interface HumanReviewRequirement {
  required: true;
  reason: string;
  mustApproveSnapshotHash: string;
  compilerBlockedUntilApproved: true;
}
