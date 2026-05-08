import type { BusinessContext } from "./business-context.model.js";
import {
  CampaignLifecycleStage,
  CampaignUrgency,
  type CampaignIntent,
} from "./campaign-intent.model.js";
import {
  CommunicationObjective,
  CommunicationRiskLevel,
  CtaStrategyType,
  MediaStrategyType,
  PersonalizationLevel,
  StrategyConfidence,
  type CtaStrategy,
  type MediaStrategy,
  type MessageStructureStrategy,
  type PersonalizationStrategy,
  type RiskStrategy,
  type StrategyConstraint,
} from "./communication-strategy.model.js";
import { BusinessPolicySeverity, TemplateCategory } from "./enums.js";

const AUTHENTICATION_KEYWORDS = [
  "otp",
  "codigo",
  "verificacao",
  "senha",
  "login",
  "autenticacao",
];

const UTILITY_KEYWORDS = [
  "confirmar",
  "confirmacao",
  "pedido",
  "agendamento",
  "consulta",
  "lembrete",
  "retirada",
  "entrega",
  "status",
  "atualizacao",
  "pagamento",
  "boleto",
  "recibo",
];

const MARKETING_KEYWORDS = [
  "promo",
  "promocao",
  "oferta",
  "desconto",
  "campanha",
  "lancamento",
  "novidade",
  "venda",
  "engajamento",
];

const SENSITIVE_SEGMENTS = [
  "health",
  "healthcare",
  "saude",
  "pharmacy",
  "farmacia",
  "finance",
  "financial",
  "financas",
  "insurance",
  "legal",
  "political",
  "politico",
];

export function recommendCategory(intent: CampaignIntent): TemplateCategory {
  if (intent.requestedCategory) return intent.requestedCategory;
  if (intent.lifecycleStage === CampaignLifecycleStage.Authentication) {
    return TemplateCategory.Authentication;
  }
  if (containsAny(intent.detectedKeywords, AUTHENTICATION_KEYWORDS)) {
    return TemplateCategory.Authentication;
  }
  if (containsAny(intent.detectedKeywords, MARKETING_KEYWORDS)) {
    return TemplateCategory.Marketing;
  }
  if (containsAny(intent.detectedKeywords, UTILITY_KEYWORDS)) {
    return TemplateCategory.Utility;
  }
  return TemplateCategory.Utility;
}

export function recommendObjective(intent: CampaignIntent): CommunicationObjective {
  if (intent.lifecycleStage === CampaignLifecycleStage.Authentication) {
    return CommunicationObjective.Authenticate;
  }
  if (containsAny(intent.detectedKeywords, ["lembrete", "reminder", "lembrar"])) {
    return CommunicationObjective.Remind;
  }
  if (containsAny(intent.detectedKeywords, ["confirmar", "confirmacao"])) {
    return CommunicationObjective.Confirm;
  }
  if (containsAny(intent.detectedKeywords, MARKETING_KEYWORDS)) {
    return CommunicationObjective.Promote;
  }
  if (containsAny(intent.detectedKeywords, ["responder", "resposta", "feedback"])) {
    return CommunicationObjective.CollectResponse;
  }
  if (intent.lifecycleStage === CampaignLifecycleStage.Support) {
    return CommunicationObjective.Support;
  }
  return CommunicationObjective.Notify;
}

export function recommendCtaStrategy(
  intent: CampaignIntent,
  category: TemplateCategory
): CtaStrategy {
  if (category === TemplateCategory.Authentication) {
    return {
      type: CtaStrategyType.CopyCode,
      required: true,
      labelHint: "Copiar codigo",
      rationale: "Authentication flows should focus on code delivery and code usage.",
    };
  }

  if (containsAny(intent.detectedKeywords, ["ligar", "telefone", "whatsapp", "contato"])) {
    return {
      type: CtaStrategyType.CallPhone,
      required: false,
      labelHint: "Falar com equipe",
      rationale: "The intent suggests human contact or phone-based support.",
    };
  }

  if (containsAny(intent.detectedKeywords, ["site", "link", "acessar", "comprar", "pagar", "boleto"])) {
    return {
      type: CtaStrategyType.VisitUrl,
      required: false,
      labelHint: "Acessar",
      rationale: "The intent implies a destination outside the message.",
    };
  }

  if (containsAny(intent.detectedKeywords, ["confirmar", "remarcar", "cancelar", "escolher"])) {
    return {
      type: CtaStrategyType.QuickReply,
      required: false,
      labelHint: "Confirmar",
      rationale: "The intent benefits from a low-friction user choice.",
    };
  }

  return {
    type: CtaStrategyType.None,
    required: false,
    rationale: "The message can be delivered as informational content without a call to action.",
  };
}

export function recommendMediaStrategy(
  intent: CampaignIntent,
  category: TemplateCategory
): MediaStrategy {
  if (category === TemplateCategory.Authentication) {
    return {
      type: MediaStrategyType.None,
      required: false,
      rationale: "Authentication messages should stay minimal and text-first.",
    };
  }

  if (containsAny(intent.detectedKeywords, ["catalogo", "imagem", "produto", "foto"])) {
    return {
      type: MediaStrategyType.Image,
      required: false,
      rationale: "The intent may benefit from visual product or catalog context.",
    };
  }

  if (containsAny(intent.detectedKeywords, ["contrato", "documento", "boleto", "arquivo"])) {
    return {
      type: MediaStrategyType.Document,
      required: false,
      rationale: "The intent references a document-like artifact.",
    };
  }

  return {
    type: MediaStrategyType.TextHeader,
    required: false,
    rationale: "A short text header can improve clarity without depending on media assets.",
  };
}

export function recommendPersonalizationStrategy(
  intent: CampaignIntent,
  businessContext: BusinessContext
): PersonalizationStrategy {
  const variables = [
    {
      name: "customer_name",
      description: "Recipient first name or preferred display name.",
      example: "Ana",
      required: false,
    },
  ];

  if (containsAny(intent.detectedKeywords, ["pedido", "consulta", "agendamento", "entrega", "retirada"])) {
    variables.push({
      name: "event_reference",
      description: "Reference for the transaction, appointment, order, or event.",
      example: "pedido 1234",
      required: true,
    });
  }

  if (containsAny(intent.detectedKeywords, ["data", "hora", "amanha", "prazo"])) {
    variables.push({
      name: "scheduled_time",
      description: "Relevant date, time, or deadline for the message.",
      example: "10/05 as 14h",
      required: true,
    });
  }

  const regulated = isSensitiveBusiness(businessContext);
  const level =
    variables.length >= 3
      ? PersonalizationLevel.High
      : variables.length === 2 || regulated
        ? PersonalizationLevel.Contextual
        : PersonalizationLevel.Basic;

  return {
    level,
    suggestedVariables: variables,
    rationale: regulated
      ? "Regulated or sensitive contexts benefit from clearer contextual personalization."
      : "Personalization is based on the specificity detected in the campaign intent.",
  };
}

export function recommendRiskStrategy(
  intent: CampaignIntent,
  businessContext: BusinessContext,
  category: TemplateCategory
): RiskStrategy {
  const reasons: string[] = [];
  const mitigationHints: string[] = [];

  if (isSensitiveBusiness(businessContext)) {
    reasons.push("Business segment appears sensitive or regulated.");
    mitigationHints.push("Keep claims factual and avoid promises of guaranteed outcomes.");
  }

  if (category === TemplateCategory.Marketing) {
    reasons.push("Marketing communication usually has higher approval and consent risk.");
    mitigationHints.push("Avoid excessive urgency, misleading offers, or broad claims.");
  }

  const blockingPolicies = businessContext.policies.filter(
    (policy) => policy.severity === BusinessPolicySeverity.Block
  );
  if (blockingPolicies.length > 0) {
    reasons.push("Business context includes blocking policies.");
    mitigationHints.push("Review business-specific block rules before copy generation.");
  }

  if (intent.urgency === CampaignUrgency.TimeSensitive || intent.urgency === CampaignUrgency.High) {
    reasons.push("Intent contains urgency signals.");
    mitigationHints.push("Use time sensitivity only when it is factual and necessary.");
  }

  const level =
    reasons.length >= 3
      ? CommunicationRiskLevel.High
      : reasons.length === 2
        ? CommunicationRiskLevel.Medium
        : reasons.length === 1
          ? CommunicationRiskLevel.Medium
          : CommunicationRiskLevel.Low;

  return { level, reasons, mitigationHints };
}

export function recommendMessageStructure(
  category: TemplateCategory,
  cta: CtaStrategy,
  media: MediaStrategy
): MessageStructureStrategy {
  return {
    includeHeader: media.type !== MediaStrategyType.None,
    includeFooter: category !== TemplateCategory.Authentication,
    includeButtons: cta.type !== CtaStrategyType.None,
    primaryMessageRole: category === TemplateCategory.Authentication ? "security_code" : "main_message",
    supportingMessageRoles: [
      ...(media.type !== MediaStrategyType.None ? ["context"] : []),
      ...(cta.type !== CtaStrategyType.None ? ["call_to_action"] : []),
      ...(category !== TemplateCategory.Authentication ? ["disclaimer"] : []),
    ],
  };
}

export function buildStrategyConstraints(
  businessContext: BusinessContext,
  category: TemplateCategory
): StrategyConstraint[] {
  const businessConstraints = businessContext.policies.map((policy) => ({
    id: policy.id,
    source: "business_context" as const,
    severity: policy.severity,
    description: policy.rule,
  }));

  const systemConstraints: StrategyConstraint[] = [
    {
      id: "channel.template_variables.sequential",
      source: "channel_policy",
      severity: "block",
      description: "Variables must be sequential and include realistic examples.",
    },
  ];

  if (category === TemplateCategory.Authentication) {
    systemConstraints.push({
      id: "channel.authentication.restricted",
      source: "channel_policy",
      severity: "block",
      description: "Authentication communication must remain focused on verification.",
    });
  }

  return [...businessConstraints, ...systemConstraints];
}

export function recommendConfidence(risk: RiskStrategy): StrategyConfidence {
  if (risk.level === CommunicationRiskLevel.High || risk.level === CommunicationRiskLevel.Critical) {
    return StrategyConfidence.Medium;
  }
  return StrategyConfidence.High;
}

export function detectKeywords(text: string): string[] {
  const normalized = normalize(text);
  const knownKeywords = [
    ...AUTHENTICATION_KEYWORDS,
    ...UTILITY_KEYWORDS,
    ...MARKETING_KEYWORDS,
    "ligar",
    "telefone",
    "site",
    "link",
    "acessar",
    "comprar",
    "pagar",
    "remarcar",
    "cancelar",
    "documento",
  ];

  return [...new Set(
    knownKeywords
      .filter((keyword) => normalized.includes(normalize(keyword)))
      .map((keyword) => normalize(keyword))
  )];
}

export function inferLifecycleStage(keywords: string[]): CampaignLifecycleStage {
  if (containsAny(keywords, AUTHENTICATION_KEYWORDS)) return CampaignLifecycleStage.Authentication;
  if (containsAny(keywords, MARKETING_KEYWORDS)) return CampaignLifecycleStage.Acquisition;
  if (containsAny(keywords, ["suporte", "ajuda", "atendimento"])) return CampaignLifecycleStage.Support;
  if (containsAny(keywords, UTILITY_KEYWORDS)) return CampaignLifecycleStage.Transactional;
  return CampaignLifecycleStage.Unknown;
}

export function inferUrgency(text: string): CampaignUrgency {
  const normalized = normalize(text);
  if (containsAnyText(normalized, ["ultimas horas", "agora", "imediato"])) {
    return CampaignUrgency.TimeSensitive;
  }
  if (containsAnyText(normalized, ["urgente", "hoje", "amanha", "prazo"])) {
    return CampaignUrgency.High;
  }
  if (containsAnyText(normalized, ["quando puder", "sem urgencia"])) {
    return CampaignUrgency.Low;
  }
  return CampaignUrgency.Normal;
}

function isSensitiveBusiness(businessContext: BusinessContext): boolean {
  const searchable = normalize([
    businessContext.segment,
    businessContext.description,
    businessContext.complianceNotes ?? "",
  ].join(" "));

  return SENSITIVE_SEGMENTS.some((segment) => searchable.includes(normalize(segment)));
}

function containsAny(values: string[], candidates: string[]): boolean {
  return candidates.some((candidate) => values.includes(normalize(candidate)));
}

function containsAnyText(text: string, candidates: string[]): boolean {
  return candidates.some((candidate) => text.includes(normalize(candidate)));
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
