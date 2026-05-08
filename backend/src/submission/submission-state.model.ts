export const MetaSubmissionState = {
  DryRunReady: "DRY_RUN_READY",
  MetaPending: "META_PENDING",
  MetaAccepted: "META_ACCEPTED",
  MetaRejected: "META_REJECTED",
  Failed: "FAILED",
} as const;

export type MetaSubmissionState =
  (typeof MetaSubmissionState)[keyof typeof MetaSubmissionState];

export interface SubmissionArtifact {
  id: string;
  reviewSessionId: string;
  compileChecksum: string;
  state: MetaSubmissionState;
  dryRun: boolean;
  createdAt: string;
}
