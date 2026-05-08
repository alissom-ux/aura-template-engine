import type { CompiledTemplate, CopywriterOutput, PipelineRequest } from "../types/index.js";

export class CompilerAgent {
  async run(input: { copy: CopywriterOutput; request: PipelineRequest }): Promise<CompiledTemplate> {
    // TODO Phase 2: Transform CopywriterOutput into exact Meta API format
    // Validate field lengths, variable sequences, button limits
    throw new Error("CompilerAgent not yet implemented — Phase 2");
  }
}
