import type { PipelineResponse } from "./pipeline";

export type ConversationState =
  | "idle"
  | "collecting_intent"
  | "generating"
  | "draft_ready"
  | "blocked"
  | "review_ready";

export function resolveConversationState(
  userPrompt: string,
  loading: boolean,
  result: PipelineResponse | null
): ConversationState {
  if (loading) return "generating";
  if (!userPrompt.trim()) return "idle";
  if (!result) return "collecting_intent";

  const hasBlocks = Boolean(
    result.errors?.length ||
    result.policyReview?.violations.length ||
    result.auditReport?.blockingIssues.length
  );

  if (hasBlocks || !result.success) return "blocked";
  if (result.auditReport?.status === "READY_FOR_REVIEW") return "review_ready";
  return "draft_ready";
}
