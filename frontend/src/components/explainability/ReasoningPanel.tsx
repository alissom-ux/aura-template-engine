import type { PipelineResponse } from "../../types/pipeline";
import { MetaPolicyExplanation } from "./MetaPolicyExplanation";
import { RecommendationCard } from "./RecommendationCard";
import { RiskExplanationCard } from "./RiskExplanationCard";
import { SuggestedFixCard } from "./SuggestedFixCard";

export function ReasoningPanel({ result }: { result: PipelineResponse | null }) {
  if (!result) {
    return (
      <section className="panel reasoning-panel">
        <h2>Reasoning summary</h2>
        <p className="muted">Depois da geracao, o copiloto explica categoria, riscos, politica considerada e correcoes recomendadas.</p>
      </section>
    );
  }

  const strategy = result.communicationStrategy;
  const policy = result.policyReview;
  const audit = result.auditReport;
  const category = strategy?.recommendedCategory || policy?.categoryPrediction.predictedCategory || "A definir";
  const declaredCategory = policy?.categoryPrediction.declaredCategory;
  const mainRisk = firstText([
    ...(strategy?.risk?.reasons ?? []),
    policy?.behavioralSummary,
    audit?.warnings[0],
    audit?.blockingIssues[0],
  ]);
  const firstPolicyIssue = policy?.violations[0] ?? policy?.warnings[0];
  const fix = firstText([
    policy?.suggestions[0]?.message,
    audit?.recommendedActions[0],
    strategy?.risk?.mitigationHints?.[0],
    defaultFixForCategory(category),
  ]);

  return (
    <section className="panel reasoning-panel">
      <div className="panel-heading">
        <div>
          <h2>Reasoning summary</h2>
          <p className="muted">Leitura operacional gerada a partir dos artefatos atuais do pipeline.</p>
        </div>
      </div>

      <div className="reasoning-summary">
        <ReasoningLine label="Objetivo detectado" value={readString(strategy?.messagingGoal) || readString(result.campaignIntent?.goal) || "Criar template WhatsApp revisavel."} />
        <ReasoningLine label="Intencao principal" value={readString(result.campaignIntent?.type) || "Campanha operacional de comunicacao."} />
        <ReasoningLine label="Estrategia sugerida" value={strategy?.keyMessages?.[0] || "Mensagem clara com CTA revisavel e aderente ao contexto de negocio."} />
        <ReasoningLine label="Principal risco" value={mainRisk || "Nenhum risco principal destacado pelo pipeline."} />
      </div>

      <div className="explain-grid">
        <RecommendationCard
          title="Categoria recomendada"
          recommendation={`${declaredCategory ? `${declaredCategory} -> ` : ""}${category}`}
          why={categoryWhy(category, Boolean(policy?.categoryPrediction.overrideRecommended))}
          confidence={policy?.categoryPrediction.confidence}
        />

        <RiskExplanationCard
          level={strategy?.risk?.level || policy?.risk.estimatedRisk || audit?.riskLevel || "LOW"}
          reason={mainRisk || "A auditoria nao encontrou sinais fortes de risco operacional."}
          impact={riskImpact(strategy?.risk?.level || policy?.risk.estimatedRisk || audit?.riskLevel)}
          confidence={policy?.risk.confidence}
        />

        {firstPolicyIssue ? (
          <MetaPolicyExplanation
            rule={firstPolicyIssue.rule}
            interpretation={firstPolicyIssue.behavioralInterpretation}
            impact={policyImpact(firstPolicyIssue.severity)}
          />
        ) : (
          <MetaPolicyExplanation
            rule="Sem violacao prioritaria"
            interpretation="O policy review nao apontou uma regra critica como principal bloqueio."
            impact="Isso aumenta a confianca para seguir para revisao humana, mantendo atencao aos warnings e ao preview."
          />
        )}

        <SuggestedFixCard
          title="Recommended Fix"
          fix={fix}
          impact="Reduzir ambiguidade e risco de rejeicao melhora a chance de aprovacao e evita retrabalho na operacao."
        />
      </div>
    </section>
  );
}

function ReasoningLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="reasoning-line">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function firstText(values: Array<string | undefined>) {
  return values.find((value) => Boolean(value?.trim())) ?? "";
}

function categoryWhy(category: string, overrideRecommended: boolean) {
  if (overrideRecommended) {
    return "A categoria declarada parece diferente da leitura do conteudo. Isso importa porque a Meta pode rejeitar templates quando a categoria nao combina com a intencao percebida.";
  }
  if (category === "UTILITY") {
    return "UTILITY precisa estar ligada a uma acao ou transacao previa do usuario. Manter esse alinhamento reduz risco de conteudo promocional indevido.";
  }
  if (category === "MARKETING") {
    return "MARKETING e o caminho esperado para reengajamento, oferta, recuperacao e relacionamento comercial. A operacao precisa garantir opt-in e evitar promessa ou urgencia excessiva.";
  }
  return "AUTHENTICATION tem formato restrito para codigos. Qualquer desvio de formato tende a bloquear aprovacao.";
}

function riskImpact(level?: string) {
  const normalized = level?.toLowerCase() ?? "";
  if (normalized.includes("critical") || normalized.includes("high")) {
    return "Risco alto pode impedir revisao segura e aumentar chance de rejeicao Meta.";
  }
  if (normalized.includes("medium") || normalized.includes("moderate")) {
    return "Risco moderado normalmente permite revisao, mas recomenda ajuste antes de aprovar internamente.";
  }
  return "Risco baixo indica que o operador pode focar em clareza, CTA e consistencia da mensagem.";
}

function policyImpact(severity: string) {
  return severity === "block"
    ? "Um block deve ser resolvido antes de aprovacao, porque pode impedir submissao segura ou gerar rejeicao."
    : "Um warning nao bloqueia sozinho, mas sinaliza ponto que pode reduzir qualidade, clareza ou chance de aprovacao.";
}

function defaultFixForCategory(category: string) {
  if (category === "UTILITY") return "Remova incentivos promocionais e deixe claro o vinculo com uma acao previa do usuario.";
  if (category === "MARKETING") return "Reduza urgencia, evite promessa forte e mantenha CTA simples e transparente.";
  return "Use formato restrito, variavel de codigo e botao compativel com autenticacao.";
}
