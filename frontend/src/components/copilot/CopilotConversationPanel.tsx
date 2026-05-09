import type { FormEvent } from "react";
import type { ConversationState } from "../../types/experience";
import type { PipelineResponse } from "../../types/pipeline";
import { ClarificationPrompt } from "./ClarificationPrompt";
import { ContextMemoryCard } from "./ContextMemoryCard";
import { CopilotComposer } from "./CopilotComposer";
import { CopilotMessage } from "./CopilotMessage";
import { CopilotTimeline } from "./CopilotTimeline";
import { SuggestedActions } from "./SuggestedActions";

interface CopilotConversationPanelProps {
  userPrompt: string;
  companyName: string;
  industry: string;
  brandVoice: string;
  category: "MARKETING" | "UTILITY" | "AUTHENTICATION";
  loading: boolean;
  result: PipelineResponse | null;
  conversationState: ConversationState;
  onUserPromptChange: (value: string) => void;
  onCompanyNameChange: (value: string) => void;
  onIndustryChange: (value: string) => void;
  onBrandVoiceChange: (value: string) => void;
  onCategoryChange: (value: "MARKETING" | "UTILITY" | "AUTHENTICATION") => void;
  onSubmit: (event: FormEvent) => void;
}

export function CopilotConversationPanel({
  userPrompt,
  companyName,
  industry,
  brandVoice,
  category,
  loading,
  result,
  conversationState,
  onUserPromptChange,
  onCompanyNameChange,
  onIndustryChange,
  onBrandVoiceChange,
  onCategoryChange,
  onSubmit,
}: CopilotConversationPanelProps) {
  const policy = result?.policyReview;
  const audit = result?.auditReport;
  const blocks = [
    ...(result?.errors?.map((item) => item.message) ?? []),
    ...(policy?.violations.map((item) => item.behavioralInterpretation) ?? []),
    ...(audit?.blockingIssues ?? []),
  ];
  const warnings = [
    ...(result?.warnings ?? []),
    ...(policy?.warnings.map((item) => item.behavioralInterpretation) ?? []),
    ...(audit?.warnings ?? []),
  ];
  const recommendedCategory =
    result?.communicationStrategy?.recommendedCategory ||
    policy?.categoryPrediction.predictedCategory ||
    category;

  return (
    <form className="copilot-panel" onSubmit={onSubmit}>
      <div>
        <p className="eyebrow">Aura Template Engine</p>
        <h1>Operational Copilot</h1>
      </div>

      <CopilotTimeline state={conversationState} />

      <section className="conversation-thread">
        {buildMessages({
          state: conversationState,
          userPrompt,
          requestedCategory: category,
          recommendedCategory,
          warningsCount: warnings.length,
          blocksCount: blocks.length,
          nextStep: result?.nextStep,
        }).map((message, index) => (
          <CopilotMessage author={message.author} title={message.title} key={index}>
            <p>{message.body}</p>
          </CopilotMessage>
        ))}
      </section>

      <ClarificationPrompt state={conversationState} hasWarnings={warnings.length > 0} hasBlocks={blocks.length > 0} />

      <CopilotComposer value={userPrompt} loading={loading} onChange={onUserPromptChange} />

      <SuggestedActions state={conversationState} />

      <ContextMemoryCard
        companyName={companyName}
        industry={industry}
        brandVoice={brandVoice}
        category={category}
        loading={loading}
        onCompanyNameChange={onCompanyNameChange}
        onIndustryChange={onIndustryChange}
        onBrandVoiceChange={onBrandVoiceChange}
        onCategoryChange={onCategoryChange}
      />

      <button type="submit" disabled={loading}>
        {loading ? "Analisando campanha..." : "Gerar estrategia e draft"}
      </button>
    </form>
  );
}

interface MessageInput {
  state: ConversationState;
  userPrompt: string;
  requestedCategory: string;
  recommendedCategory: string;
  warningsCount: number;
  blocksCount: number;
  nextStep?: string;
}

interface CopilotConversationMessage {
  author: "assistant" | "user" | "system";
  title: string;
  body: string;
}

function buildMessages(input: MessageInput) {
  const messages: CopilotConversationMessage[] = [
    {
      author: "assistant" as const,
      title: "Especialista Meta",
      body: introForState(input),
    },
  ];

  if (input.userPrompt.trim()) {
    messages.push({
      author: "user" as const,
      title: "Objetivo da campanha",
      body: input.userPrompt,
    });
  }

  if (input.state !== "idle" && input.state !== "collecting_intent") {
    messages.push({
      author: "assistant" as const,
      title: "Leitura operacional",
      body: `Categoria inicial: ${input.requestedCategory}. Categoria recomendada agora: ${input.recommendedCategory}. Blocks: ${input.blocksCount}. Warnings: ${input.warningsCount}.`,
    });
  }

  if (input.blocksCount > 0) {
    messages.push({
      author: "assistant" as const,
      title: "Proximo passo",
      body: "Resolva os blocks antes de tratar ajustes finos. Eles indicam risco real para aprovacao ou continuidade do fluxo.",
    });
  } else if (input.state === "review_ready") {
    messages.push({
      author: "assistant" as const,
      title: "Proximo passo",
      body: "O draft esta pronto para revisao operacional. Confira o preview e o parecer antes de aprovar internamente.",
    });
  } else if (input.nextStep) {
    messages.push({
      author: "system" as const,
      title: "Etapa do pipeline",
      body: input.nextStep,
    });
  }

  return messages;
}

function introForState(input: MessageInput) {
  if (input.state === "idle") {
    return "Me conte o que voce quer comunicar no WhatsApp. Eu vou organizar a campanha como template Meta.";
  }
  if (input.state === "collecting_intent") {
    return "Entendi a direcao. Posso montar uma primeira estrategia, revisar categoria e apontar riscos de aprovacao.";
  }
  if (input.state === "generating") {
    return "Estou avaliando objetivo, categoria, estrutura da mensagem, compliance e readiness de revisao.";
  }
  if (input.state === "blocked") {
    return "Encontrei pontos impeditivos. Vamos tratar primeiro o que pode bloquear aprovacao ou revisao segura.";
  }
  if (input.state === "review_ready") {
    return "A mensagem chegou em um estado revisavel. Agora a decisao e operacional: conferir, ajustar ou aprovar.";
  }
  return "O draft foi gerado. Agora vou te ajudar a ler estrategia, riscos e proximos passos.";
}
