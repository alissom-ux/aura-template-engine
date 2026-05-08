import type { BusinessContext } from "./business-context.model.js";
import type { CommunicationStrategy } from "./communication-strategy.model.js";
import type { CopyBlockSet } from "./copy-block.model.js";
import { TemplateCategory } from "./enums.js";
import {
  PolicySignalType,
  type PolicySignal,
} from "./policy-violation.model.js";
import {
  PolicyRiskLevel,
  type RiskScore,
} from "./policy-review.model.js";
import type { TemplateComponent } from "./template.model.js";

export interface RiskScoringInput {
  businessContext: BusinessContext;
  communicationStrategy: CommunicationStrategy;
  copyBlocks: CopyBlockSet;
  templateComponents: TemplateComponent[];
}

interface BehavioralPattern {
  type: PolicySignalType;
  label: string;
  terms: string[];
  weight: number;
  interpretation: string;
}

const PATTERNS: BehavioralPattern[] = [
  {
    type: PolicySignalType.SpamPressure,
    label: "Excessive urgency or pressure",
    terms: ["agora", "ultimas horas", "imperdivel", "corra", "nao perca", "urgente"],
    weight: 22,
    interpretation: "The message may pressure the recipient into acting quickly instead of making an informed choice.",
  },
  {
    type: PolicySignalType.Manipulation,
    label: "Manipulative framing",
    terms: ["voce foi escolhido", "exclusivo para voce", "ultima chance", "garantido"],
    weight: 24,
    interpretation: "The message may create artificial scarcity or special-status pressure.",
  },
  {
    type: PolicySignalType.UnsupportedClaim,
    label: "Unsupported result claim",
    terms: ["garantido", "sem risco", "resultado certo", "aprovacao garantida", "cura"],
    weight: 28,
    interpretation: "The message may imply a result the business context did not substantiate.",
  },
  {
    type: PolicySignalType.TrustAndSafety,
    label: "Data or credential sensitivity",
    terms: ["senha", "cartao", "cpf", "codigo", "token", "dados bancarios"],
    weight: 18,
    interpretation: "The message touches sensitive data and needs a narrow, safety-first purpose.",
  },
];

const SENSITIVE_SEGMENT_TERMS = [
  "saude",
  "health",
  "finance",
  "previdenci",
  "seguro",
  "legal",
  "politic",
];

export class RiskScoringEngine {
  score(input: RiskScoringInput): RiskScore {
    const text = normalize(collectText(input.copyBlocks, input.templateComponents));
    const signals = [
      ...detectBehavioralSignals(text),
      ...detectContextualSignals(input.businessContext, input.communicationStrategy),
      ...detectFormattingSignals(input.templateComponents),
    ];
    const weightedScore = clamp(signals.reduce((sum, signal) => sum + signal.weight, 0), 0, 100);
    const probability = weightedScore / 100;
    const confidence = calculateConfidence(signals, text);

    return {
      estimatedRisk: toRiskLevel(weightedScore),
      probability,
      confidence,
      signals,
      behavioralInterpretation: summarizeBehavior(signals),
    };
  }
}

function detectBehavioralSignals(text: string): PolicySignal[] {
  return PATTERNS.flatMap((pattern) => {
    const evidence = pattern.terms.filter((term) => text.includes(normalize(term)));
    if (evidence.length === 0) return [];

    return [{
      type: pattern.type,
      label: pattern.label,
      evidence,
      weight: Math.min(pattern.weight + evidence.length * 3, 35),
      behavioralInterpretation: pattern.interpretation,
    }];
  });
}

function detectContextualSignals(
  businessContext: BusinessContext,
  strategy: CommunicationStrategy
): PolicySignal[] {
  const searchable = normalize(`${businessContext.segment} ${businessContext.description} ${businessContext.complianceNotes ?? ""}`);
  const signals: PolicySignal[] = [];

  if (SENSITIVE_SEGMENT_TERMS.some((term) => searchable.includes(term))) {
    signals.push({
      type: PolicySignalType.SensitiveDomain,
      label: "Sensitive or regulated business context",
      evidence: [businessContext.segment],
      weight: 18,
      behavioralInterpretation: "Meta may review this message more carefully because the business domain can affect finances, health, identity, or legal outcomes.",
    });
  }

  if (strategy.recommendedCategory === TemplateCategory.Marketing && strategy.cta.required) {
    signals.push({
      type: PolicySignalType.SpamPressure,
      label: "Marketing message with required CTA",
      evidence: [strategy.cta.type],
      weight: 14,
      behavioralInterpretation: "Promotional content with a required action can look more like acquisition pressure than service communication.",
    });
  }

  return signals;
}

function detectFormattingSignals(components: TemplateComponent[]): PolicySignal[] {
  const body = components.find((component) => component.type === "BODY");
  if (!body) return [];

  const uppercaseWords = body.text.split(/\s+/).filter((word) => word.length > 3 && word === word.toUpperCase());
  if (uppercaseWords.length < 3) return [];

  return [{
    type: PolicySignalType.FormattingRisk,
    label: "High emphasis formatting",
    evidence: uppercaseWords.slice(0, 5),
    weight: 12,
    behavioralInterpretation: "Excessive emphasis can resemble aggressive promotion or urgency.",
  }];
}

function collectText(copyBlocks: CopyBlockSet, components: TemplateComponent[]): string {
  const copyText = copyBlocks.blocks.map((block) => block.text).join(" ");
  const componentText = components.map((component) => {
    if (component.type === "BODY" || component.type === "FOOTER" || component.type === "HEADER") return component.text ?? "";
    return component.buttons.map((button) => "text" in button ? button.text : button.example).join(" ");
  }).join(" ");
  return `${copyText} ${componentText}`;
}

function calculateConfidence(signals: PolicySignal[], text: string): number {
  if (text.length < 30) return 0.45;
  if (signals.length >= 3) return 0.86;
  if (signals.length === 2) return 0.76;
  if (signals.length === 1) return 0.64;
  return 0.7;
}

function summarizeBehavior(signals: PolicySignal[]): string {
  if (signals.length === 0) {
    return "No strong behavioral policy risk signals were detected in the deterministic review.";
  }
  return signals.map((signal) => signal.behavioralInterpretation).join(" ");
}

function toRiskLevel(score: number): PolicyRiskLevel {
  if (score >= 75) return PolicyRiskLevel.Critical;
  if (score >= 50) return PolicyRiskLevel.High;
  if (score >= 20) return PolicyRiskLevel.Medium;
  return PolicyRiskLevel.Low;
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
