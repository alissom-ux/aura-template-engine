import type {
  AuditReport,
  BusinessContext,
  CompiledTemplate,
  PolicyReview,
  TemplateComponent,
} from "../types/index.js";
import { AuditEngine, type AuditEngineInput } from "../core/audit.engine.js";
import { PolicyRiskLevel } from "../core/policy-review.model.js";
import { OpenAiJsonClient, PipelineLogger, PromptRegistry } from "../ai/index.js";

interface OperationalAuditInput extends AuditEngineInput {
  businessContext: BusinessContext;
}

interface AuditorAiOutput {
  riskScore?: number;
  riskLevel?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  spamSignals?: string[];
  aggressiveLanguage?: string[];
  complianceNotes?: string[];
  suggestedCorrections?: string[];
}

export class AuditorAgent {
  private readonly engine = new AuditEngine();
  private readonly ai = new OpenAiJsonClient();
  private readonly logger = new PipelineLogger();

  async run(input: { compiled: CompiledTemplate }): Promise<AuditReport> {
    return createLegacyAudit(input.compiled);
  }

  async auditDraft(input: OperationalAuditInput): Promise<AuditReport> {
    const deterministic = this.engine.audit(input);
    const aiResult = await this.ai.completeJson<AuditorAiOutput>({
      agent: "AuditorAgent",
      systemPrompt: PromptRegistry.auditor,
      fallbackLabel: "AuditEngine",
      userPayload: {
        businessContext: input.businessContext,
        validation: input.validation,
        policyReview: input.policyReview,
        templateComponents: input.templateComponents,
        deterministicAudit: deterministic,
        requiredJsonShape: {
          riskScore: 0,
          riskLevel: "LOW | MEDIUM | HIGH | CRITICAL",
          spamSignals: ["string"],
          aggressiveLanguage: ["string"],
          complianceNotes: ["string"],
          suggestedCorrections: ["string"],
        },
      },
    });

    const enriched = aiResult.output
      ? enrichAudit(deterministic, input.policyReview, aiResult.output)
      : deterministic;

    this.logger.info({
      agent: "AuditorAgent",
      stage: "audit.completed",
      detail: {
        aiSkipped: aiResult.skipped,
        status: enriched.status,
        riskLevel: enriched.riskLevel,
        warningCount: enriched.warnings.length,
        blockingCount: enriched.blockingIssues.length,
      },
    });

    return enriched;
  }
}

function enrichAudit(
  audit: AuditReport,
  policyReview: PolicyReview,
  ai: AuditorAiOutput
): AuditReport {
  const riskLevel = ai.riskLevel ?? audit.riskLevel;
  const aiWarnings = [
    ...(ai.spamSignals ?? []).map((item) => `Spam signal: ${item}`),
    ...(ai.aggressiveLanguage ?? []).map((item) => `Aggressive language: ${item}`),
    ...(ai.complianceNotes ?? []),
  ];
  const blockingIssues = riskLevel === PolicyRiskLevel.Critical || riskLevel === PolicyRiskLevel.High
    ? [...audit.blockingIssues, ...policyReview.violations.map((violation) => violation.rule)]
    : audit.blockingIssues;

  return {
    ...audit,
    riskLevel,
    blockingIssues: unique(blockingIssues),
    warnings: unique([...audit.warnings, ...aiWarnings]),
    recommendedActions: unique([
      ...audit.recommendedActions,
      ...(ai.suggestedCorrections ?? []),
    ]),
    summary: `${audit.summary} AI audit risk score: ${ai.riskScore ?? "n/a"}.`,
  };
}

function createLegacyAudit(compiled: CompiledTemplate): AuditReport {
  const bodyText = collectText(compiled.components);
  const warnings = detectSpamTerms(bodyText);
  return {
    status: warnings.length > 0 ? "NEEDS_FIXES" : "READY_FOR_REVIEW",
    canSubmit: warnings.length === 0 && compiled.submissionReady,
    requiresHumanReview: true,
    riskLevel: warnings.length > 0 ? "MEDIUM" : "LOW",
    summary: warnings.length > 0 ? "Legacy audit found wording risk." : "Legacy audit passed.",
    checklist: [],
    blockingIssues: [],
    warnings,
    recommendedActions: warnings.length > 0 ? ["Review aggressive or spam-like terms."] : [],
    reviewNotes: compiled.compilationNotes,
    submissionGate: {
      allowed: false,
      reason: "Legacy /api audit still requires explicit pipeline review.",
      requiresExplicitConfirmation: true,
    },
  };
}

function collectText(components: TemplateComponent[]): string {
  return components.map((component) => {
    if (component.type === "BODY" || component.type === "HEADER" || component.type === "FOOTER") return component.text ?? "";
    return component.buttons.map((button) => "text" in button ? button.text : button.example).join(" ");
  }).join(" ");
}

function detectSpamTerms(text: string): string[] {
  const normalized = text.toLowerCase();
  return ["urgente", "ultima chance", "garantido", "corra"]
    .filter((term) => normalized.includes(term))
    .map((term) => `Potential spam/aggressive term: ${term}`);
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}
