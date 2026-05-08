export const ApprovalDecisionType = {
  Approve: "APPROVE",
  Reject: "REJECT",
  RequestChanges: "REQUEST_CHANGES",
} as const;

export type ApprovalDecisionType =
  (typeof ApprovalDecisionType)[keyof typeof ApprovalDecisionType];

export const ApprovalGateStatus = {
  Locked: "LOCKED",
  Open: "OPEN",
  Rejected: "REJECTED",
  ChangesRequested: "CHANGES_REQUESTED",
} as const;

export type ApprovalGateStatus =
  (typeof ApprovalGateStatus)[keyof typeof ApprovalGateStatus];

export interface ApprovalDecision {
  id: string;
  reviewSessionId: string;
  snapshotId: string;
  decision: ApprovalDecisionType;
  reviewer: HumanReviewer;
  comment?: string;
  approvalToken?: string;
  createdAt: string;
}

export interface HumanReviewer {
  id: string;
  name: string;
  email?: string;
  role?: string;
}

export interface ApprovalGate {
  status: ApprovalGateStatus;
  canCompile: boolean;
  canSubmit: boolean;
  approvalToken?: string;
  reason: string;
  requiresExplicitApproval: true;
  approvedBy?: HumanReviewer;
  approvedAt?: string;
}

export interface ApprovalDecisionInput {
  reviewSessionId: string;
  snapshotId: string;
  snapshotHash: string;
  snapshotVersion: number;
  decision: ApprovalDecisionType;
  reviewer: HumanReviewer;
  comment?: string;
}
