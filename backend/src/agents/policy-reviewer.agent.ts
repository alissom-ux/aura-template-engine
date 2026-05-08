import type { CopywriterOutput, PolicyReviewResult } from "../types/index.js";

export class PolicyReviewerAgent {
  async run(input: { copy: CopywriterOutput; businessContextId: string }): Promise<PolicyReviewResult> {
    // TODO Phase 2: Load META_POLICY_RULES + BusinessContext.policies
    // Validate copy against all rules
    // Return violations with suggestions
    throw new Error("PolicyReviewerAgent not yet implemented — Phase 2");
  }
}
