import type { ConversationState } from "../../types/experience";

interface ClarificationPromptProps {
  state: ConversationState;
  hasWarnings: boolean;
  hasBlocks: boolean;
}

export function ClarificationPrompt({ state, hasWarnings, hasBlocks }: ClarificationPromptProps) {
  const prompt = resolvePrompt(state, hasWarnings, hasBlocks);
  if (!prompt) return null;

  return (
    <section className={`clarification-prompt ${hasBlocks ? "danger" : hasWarnings ? "warning" : ""}`}>
      <strong>{prompt.title}</strong>
      <p>{prompt.body}</p>
    </section>
  );
}

function resolvePrompt(state: ConversationState, hasWarnings: boolean, hasBlocks: boolean) {
  if (state === "idle") {
    return {
      title: "Comece pela meta da campanha",
      body: "Descreva o publico, o motivo do contato e a acao esperada. Eu organizo isso como template Meta.",
    };
  }

  if (state === "collecting_intent") {
    return {
      title: "Contexto suficiente para uma primeira analise",
      body: "Ao gerar, vou interpretar categoria, risco, estrutura da mensagem e pontos de aprovacao.",
    };
  }

  if (state === "generating") {
    return {
      title: "Analisando como especialista Meta",
      body: "Estou estruturando estrategia, copy, compliance e auditoria com o pipeline atual.",
    };
  }

  if (hasBlocks) {
    return {
      title: "Ha bloqueios antes da revisao",
      body: "Priorize os blocks. Eles indicam pontos que podem impedir aprovacao ou submissao segura.",
    };
  }

  if (hasWarnings) {
    return {
      title: "Pronto para revisao com ressalvas",
      body: "Nao ha bloqueios principais, mas vale revisar os warnings antes de aprovar o snapshot.",
    };
  }

  if (state === "review_ready") {
    return {
      title: "Pronto para revisao operacional",
      body: "Revise o preview, confirme a estrategia e avance para aprovacao interna quando estiver confortavel.",
    };
  }

  return null;
}
