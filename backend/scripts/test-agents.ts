import assert from "node:assert/strict";
import { TemplatePipelineOrchestrator } from "../src/pipeline/index.js";

process.env.AURA_AI_MODE = "deterministic";
process.env.AURA_RUNTIME_MODE = "DEV";

const orchestrator = new TemplatePipelineOrchestrator();

async function main() {
  const result = await orchestrator.createDraft({
    userPrompt: "Crie uma mensagem acolhedora para reengajar clientes que abandonaram o carrinho sem usar urgencia agressiva.",
    businessContext: {
      companyName: "Aura Store",
      industry: "E-commerce",
      brandVoice: "Empatico, claro, humano e sem pressao comercial",
      complianceNotes: "Evitar promessas de desconto garantido.",
    },
    defaults: {
      category: "MARKETING",
      language: "pt_BR",
    },
  });

  assert.ok(result.executionId, "executionId should be present");
  assert.ok(result.templateComponents?.some((component) => component.type === "BODY"), "BODY component should be generated");
  assert.ok(result.reviewSession?.id, "reviewSession should be created");
  assert.ok(result.decisionTrace.length >= 1, "decision trace should be populated");

  console.log(JSON.stringify({
    success: result.success,
    executionId: result.executionId,
    nextStep: result.nextStep,
    reviewSessionId: result.reviewSession?.id,
    componentTypes: result.templateComponents?.map((component) => component.type),
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
