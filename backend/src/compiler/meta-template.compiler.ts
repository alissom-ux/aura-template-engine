import type { ReviewSnapshot } from "../core/index.js";
import type { MetaTemplatePayload } from "./meta-compiler.types.js";
import { MetaComponentCompiler } from "./meta-component.compiler.js";

export class MetaTemplateCompiler {
  private readonly componentCompiler = new MetaComponentCompiler();

  compile(snapshot: ReviewSnapshot): MetaTemplatePayload {
    return {
      name: createTemplateName(snapshot.semanticTemplate.intent.normalizedGoal),
      category: snapshot.communicationStrategy.recommendedCategory,
      language: snapshot.semanticTemplate.intent.language,
      components: snapshot.templateComponents.map((component) => this.componentCompiler.compile(component)),
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
