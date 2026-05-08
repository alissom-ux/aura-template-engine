import { randomUUID } from "node:crypto";
import type { BusinessContext } from "./business-context.model.js";
import type { CampaignIntent } from "./campaign-intent.model.js";
import type { CommunicationStrategy } from "./communication-strategy.model.js";
import type { CopyBlockSet } from "./copy-block.model.js";
import type { MessageStructure } from "./message-structure.model.js";
import {
  PolicySignalType,
  PolicyViolationSeverity,
  type PolicySignal,
  type PolicyViolation,
} from "./policy-violation.model.js";
import {
  PolicyReviewStatus,
  PolicyRiskLevel,
  type PolicyReview,
} from "./policy-review.model.js";
import type { SemanticTemplateModel, TemplateComponent } from "./template.model.js";
import { CategoryPredictionEngine } from "./category-prediction.engine.js";
import { PolicySuggestionEngine } from "./policy-suggestion.engine.js";
import { RiskScoringEngine } from "./risk-scoring.engine.js";

export interface PolicyReviewInput {
  businessContext: BusinessContext;
  campaignIntent: CampaignIntent;
  communicationStrategy: CommunicationStrategy;
  semanticTemplateModel: SemanticTemplateModel;
  messageStructure: MessageStructure;
  copyBlocks: CopyBlockSet;
  templateComponents: TemplateComponent[];
}

export class PolicyReviewEngine {
  private readonly riskScoring = new RiskScoringEngine();
  private readonly categoryPrediction = new CategoryPredictionEngine();
  private readonly suggestionEngine = new PolicySuggestionEngine();

  review(input: PolicyReviewInput): PolicyReview {
    const risk = this.riskScoring.score(input);
    const categoryPrediction = this.categoryPrediction.predict(input);
    const violations = createViolations(risk.signals, categoryPrediction);
    const warnings = violations.filter((violation) => violation.severity === PolicyViolationSeverity.Warn);
    const blockingViolations = violations.filter((violation) => violation.severity === PolicyViolationSeverity.Block);
    const suggestions = this.suggestionEngine.suggest({ risk, categoryPrediction, violations });
    const status = resolveStatus(risk.estimatedRisk, blockingViolations.length, warnings.length, categoryPrediction.overrideRecommended);
    const confidence = average([risk.confidence, categoryPrediction.confidence]);

    return {
      status,
      approved: status === PolicyReviewStatus.Approved || status === PolicyReviewStatus.ApprovedWithWarnings,
      risk,
      categoryPrediction,
      violations: blockingViolations,
      warnings,
      suggestions,
      confidence,
      behavioralSummary: buildBehavioralSummary(risk, categoryPrediction),
    };
  }
}

function createViolations(
  signals: PolicySignal[],
  categoryPrediction: ReturnType<CategoryPredictionEngine["predict"]>
): PolicyViolation[] {
  const violations: PolicyViolation[] = signals.map((signal) => ({
    id: randomUUID(),
    severity: severityForSignal(signal),
    signalType: signal.type,
    rule: ruleForSignal(signal.type),
    behavioralInterpretation: signal.behavioralInterpretation,
    affectedText: signal.evidence.join(", "),
    suggestionIds: suggestionIdsForSignal(signal.type),
  }));

  if (categoryPrediction.overrideRecommended) {
    violations.push({
      id: randomUUID(),
      severity: PolicyViolationSeverity.Warn,
      signalType: PolicySignalType.CategoryMismatch,
      rule: "Declared category should match the likely recipient interpretation of the message.",
      behavioralInterpretation: "The message may be interpreted by Meta as a different category than the one declared.",
      affectedText: categoryPrediction.rationale.join(" "),
      estimatedCategory: categoryPrediction.predictedCategory,
      suggestionIds: ["suggest.category.override"],
    });
  }

  return violations;
}

function severityForSignal(signal: PolicySignal): PolicyViolationSeverity {
  if (signal.weight >= 30 || signal.type === PolicySignalType.UnsupportedClaim) {
    return PolicyViolationSeverity.Block;
  }
  if (signal.weight >= 14) return PolicyViolationSeverity.Warn;
  return PolicyViolationSeverity.Info;
}

function ruleForSignal(type: PolicySignalType): string {
  const rules: Record<PolicySignalType, string> = {
    [PolicySignalType.SpamPressure]: "Avoid excessive pressure, misleading urgency, or spam-like engagement tactics.",
    [PolicySignalType.Manipulation]: "Avoid manipulative framing, artificial scarcity, or deceptive personalization.",
    [PolicySignalType.UnsupportedClaim]: "Avoid unsupported, guaranteed, medical, financial, or outcome claims.",
    [PolicySignalType.CategoryMismatch]: "Use the category that best matches recipient interpretation.",
    [PolicySignalType.SensitiveDomain]: "Sensitive domains require factual, narrow, and compliant messaging.",
    [PolicySignalType.MissingContext]: "Provide enough context for the recipient to understand why they are receiving the message.",
    [PolicySignalType.FormattingRisk]: "Avoid excessive emphasis, all-caps language, or aggressive formatting.",
    [PolicySignalType.TrustAndSafety]: "Avoid unsafe collection or exposure of sensitive credentials and personal data.",
  };
  return rules[type];
}

function suggestionIdsForSignal(type: PolicySignalType): string[] {
  const suggestions: Partial<Record<PolicySignalType, string[]>> = {
    [PolicySignalType.SpamPressure]: ["suggest.copy.reduce_pressure"],
    [PolicySignalType.Manipulation]: ["suggest.copy.remove_manipulation"],
    [PolicySignalType.UnsupportedClaim]: ["suggest.copy.qualify_claim"],
    [PolicySignalType.SensitiveDomain]: ["suggest.context.add_compliance"],
  };
  return suggestions[type] ?? [];
}

function resolveStatus(
  riskLevel: PolicyRiskLevel,
  blockingCount: number,
  warningCount: number,
  categoryOverride: boolean
): PolicyReviewStatus {
  if (blockingCount > 0 || riskLevel === PolicyRiskLevel.Critical) return PolicyReviewStatus.Blocked;
  if (riskLevel === PolicyRiskLevel.High || categoryOverride) return PolicyReviewStatus.NeedsRevision;
  if (warningCount > 0 || riskLevel === PolicyRiskLevel.Medium) return PolicyReviewStatus.ApprovedWithWarnings;
  return PolicyReviewStatus.Approved;
}

function buildBehavioralSummary(
  risk: ReturnType<RiskScoringEngine["score"]>,
  categoryPrediction: ReturnType<CategoryPredictionEngine["predict"]>
): string {
  return [
    risk.behavioralInterpretation,
    categoryPrediction.overrideRecommended
      ? "Category interpretation may differ from the declared strategy."
      : "Category interpretation appears aligned with the declared strategy.",
  ].join(" ");
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
