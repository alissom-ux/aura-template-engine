import type {
  ApprovalDecision,
  ApprovalGate,
  DecisionTraceEntry,
  ExecutionArtifact,
  ReviewHistoryEvent,
  ReviewSession,
  ReviewSessionStatus,
} from "../core/index.js";

export interface ReviewActionRequest {
  reviewer: string;
  comment?: string;
  snapshotHash: string;
  snapshotVersion: number;
}

export interface ReviewActionResult {
  success: boolean;
  reviewStatus?: ReviewSessionStatus;
  gateStatus?: ApprovalGate["status"];
  canCompile?: boolean;
  approvalToken?: string;
  reviewEvents?: ReviewHistoryEvent[];
  decisionTrace?: DecisionTraceEntry[];
  artifacts?: ExecutionArtifact[];
  reviewSession?: ReviewSession;
  decision?: ApprovalDecision;
  error?: ReviewActionError;
}

export interface ReviewActionError {
  code: string;
  message: string;
  details?: unknown;
}
