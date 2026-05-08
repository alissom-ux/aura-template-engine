import type { CopywriterOutput, StrategyPlan } from "../types/index.js";

export class CopywriterAgent {
  async run(input: { strategy: StrategyPlan; businessContextId: string }): Promise<CopywriterOutput> {
    // TODO Phase 2: Call LLM with strategy + business context tone/audience
    // Output: TemplateComponents with actual copy
    throw new Error("CopywriterAgent not yet implemented — Phase 2");
  }
}
