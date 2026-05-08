import type { PipelineRequest, StrategyPlan } from "../types/index.js";

export class StrategistAgent {
  async run(request: PipelineRequest): Promise<StrategyPlan> {
    // TODO Phase 2: Call LLM to analyze intent and produce strategy
    // Input: request.intent + businessContext
    // Output: StrategyPlan
    throw new Error("StrategistAgent not yet implemented — Phase 2");
  }
}
