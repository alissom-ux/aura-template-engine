import type { CompiledTemplate, CopywriterOutput, PipelineRequest } from "../types/index.js";
import { validateSemanticTemplate } from "../core/semantic-template.validation.js";

export class CompilerAgent {
  async run(input: { copy: CopywriterOutput; request: PipelineRequest }): Promise<CompiledTemplate> {
    const name = createTemplateName(input.request.intent);
    const category = input.request.category ?? "UTILITY";
    const language = input.request.language ?? "pt_BR";
    const validation = validateSemanticTemplate({
      name,
      category,
      components: input.copy.components,
    });

    return {
      name,
      category,
      language,
      components: input.copy.components,
      submissionReady: validation.valid,
      compilationNotes: [
        input.copy.copyNotes,
        ...validation.issues.map((issue) => `${issue.severity}: ${issue.code} - ${issue.message}`),
      ],
    };
  }
}

function createTemplateName(value: string): string {
  const normalized = value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s_]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .slice(0, 512);

  return normalized.length > 0 ? normalized : "template_draft";
}
