import type { DecisionTraceEntry, ExecutionArtifact } from "../core/index.js";
import type { MetaTemplatePayload } from "../compiler/index.js";
import type { MetaSubmissionState } from "./submission-state.model.js";

export interface MetaSubmissionRequest {
  reviewSessionId: string;
  approvalToken: string;
  compileChecksum: string;
  dryRun?: boolean;
}

export interface MetaSubmissionResult {
  success: boolean;
  state: MetaSubmissionState;
  dryRun: boolean;
  metaPayload?: MetaTemplatePayload;
  metaResponse?: MetaApiSuccessResponse;
  validation?: MetaSubmissionValidation;
  decisionTrace: DecisionTraceEntry[];
  artifacts: ExecutionArtifact[];
  error?: MetaSubmissionError;
}

export interface MetaSubmissionValidation {
  valid: boolean;
  errors: MetaSubmissionError[];
}

export interface MetaSubmissionError {
  code: string;
  message: string;
  details?: unknown;
}

export interface MetaApiSuccessResponse {
  id?: string;
  status?: string;
  category?: string;
  [key: string]: unknown;
}

export interface MetaApiErrorResponse {
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
  [key: string]: unknown;
}

export interface MetaApiClientConfig {
  graphVersion: string;
  wabaId: string;
  accessToken: string;
}
