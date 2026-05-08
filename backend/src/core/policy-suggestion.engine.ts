import {
  PolicySignalType,
  PolicyViolationSeverity,
  type PolicyViolation,
} from "./policy-violation.model.js";
import type {
  CategoryPrediction,
  PolicySuggestion,
  RiskScore,
} from "./policy-review.model.js";

export interface PolicySuggestionInput {
  risk: RiskScore;
  categoryPrediction: CategoryPrediction;
  violations: PolicyViolation[];
}

export class PolicySuggestionEngine {
  suggest(input: PolicySuggestionInput): PolicySuggestion[] {
    const suggestions: PolicySuggestion[] = [];

    if (input.categoryPrediction.overrideRecommended) {
      suggestions.push({
        id: "suggest.category.override",
        target: "category",
        priority: "high",
        message: `Review category. Deterministic prediction suggests ${input.categoryPrediction.predictedCategory}.`,
        replacementHint: input.categoryPrediction.predictedCategory,
      });
    }

    for (const signal of input.risk.signals) {
      if (signal.type === PolicySignalType.SpamPressure) {
        suggestions.push({
          id: "suggest.copy.reduce_pressure",
          target: "copy",
          priority: "medium",
          message: "Reduce urgency and pressure. Prefer factual timing over scarcity language.",
        });
      }
      if (signal.type === PolicySignalType.Manipulation) {
        suggestions.push({
          id: "suggest.copy.remove_manipulation",
          target: "copy",
          priority: "high",
          message: "Remove artificial exclusivity or scarcity framing.",
        });
      }
      if (signal.type === PolicySignalType.UnsupportedClaim) {
        suggestions.push({
          id: "suggest.copy.qualify_claim",
          target: "copy",
          priority: "high",
          message: "Replace guaranteed outcomes with factual, verifiable information.",
        });
      }
      if (signal.type === PolicySignalType.SensitiveDomain) {
        suggestions.push({
          id: "suggest.context.add_compliance",
          target: "business_context",
          priority: "medium",
          message: "Add compliance notes or business-approved disclaimers for sensitive domains.",
        });
      }
    }

    if (input.violations.some((violation) => violation.severity === PolicyViolationSeverity.Block)) {
      suggestions.push({
        id: "suggest.review.before_copy",
        target: "copy",
        priority: "high",
        message: "Resolve blocking policy violations before copywriting or compiler steps.",
      });
    }

    return dedupe(suggestions);
  }
}

function dedupe(suggestions: PolicySuggestion[]): PolicySuggestion[] {
  const seen = new Set<string>();
  return suggestions.filter((suggestion) => {
    if (seen.has(suggestion.id)) return false;
    seen.add(suggestion.id);
    return true;
  });
}
