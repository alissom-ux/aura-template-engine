import type { FormEvent } from "react";
import { useState } from "react";
import { createTemplateDraft } from "../../services/pipeline.service";
import { resolveConversationState } from "../../types/experience";
import type { PipelineResponse } from "../../types/pipeline";
import type { PreviewHighlightTarget } from "../../types/preview";
import { ApprovalPanel } from "../approval/ApprovalPanel";
import { CompliancePanel } from "../compliance/CompliancePanel";
import { CopilotConversationPanel } from "../copilot/CopilotConversationPanel";
import { StrategyWorkspace } from "../strategy/StrategyWorkspace";

const initialPrompt = "crie um modelo para reativar clientes que sumiram";

export function OperationalCopilotWorkspace() {
  const [userPrompt, setUserPrompt] = useState(initialPrompt);
  const [companyName, setCompanyName] = useState("Materna");
  const [industry, setIndustry] = useState("servicos previdenciarios");
  const [brandVoice, setBrandVoice] = useState("acolhedor, humano e claro");
  const [category, setCategory] = useState<"MARKETING" | "UTILITY" | "AUTHENTICATION">("MARKETING");
  const [result, setResult] = useState<PipelineResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedPreviewTarget, setSelectedPreviewTarget] = useState<PreviewHighlightTarget | null>(null);
  const conversationState = resolveConversationState(userPrompt, loading, result);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    const response = await createTemplateDraft({
      userPrompt,
      businessContext: { companyName, industry, brandVoice },
      defaults: { category, language: "pt_BR" },
    });
    setResult(response);
    setSelectedPreviewTarget(null);
    setLoading(false);
  }

  return (
    <main className="app-shell">
      <section className="workspace-layout">
        <CopilotConversationPanel
          userPrompt={userPrompt}
          companyName={companyName}
          industry={industry}
          brandVoice={brandVoice}
          category={category}
          loading={loading}
          result={result}
          conversationState={conversationState}
          onUserPromptChange={setUserPrompt}
          onCompanyNameChange={setCompanyName}
          onIndustryChange={setIndustry}
          onBrandVoiceChange={setBrandVoice}
          onCategoryChange={setCategory}
          onSubmit={handleSubmit}
        />

        <StrategyWorkspace
          result={result}
          selectedPreviewTarget={selectedPreviewTarget}
          onSelectPreviewTarget={setSelectedPreviewTarget}
        />

        <aside className="workspace-right">
          <CompliancePanel result={result} onSelectPreviewTarget={setSelectedPreviewTarget} />
          <ApprovalPanel result={result} />
        </aside>
      </section>
    </main>
  );
}
