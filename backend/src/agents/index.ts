import { v4 as uuidv4 } from "uuid";
import type {
  AgentType,
  AuditReport,
  PipelineRequest,
  PipelineResult,
  WhatsAppTemplate,
} from "../types/index.js";
import { AuditReportStatus, PolicyRiskLevel } from "../types/index.js";
import { StrategistAgent } from "./strategist.agent.js";
import { CopywriterAgent } from "./copywriter.agent.js";
import { PolicyReviewerAgent } from "./policy-reviewer.agent.js";
import { CompilerAgent } from "./compiler.agent.js";
import { AuditorAgent } from "./auditor.agent.js";

export class AgentOrchestrator {
  private agents = {
    strategist: new StrategistAgent(),
    copywriter: new CopywriterAgent(),
    policy_reviewer: new PolicyReviewerAgent(),
    compiler: new CompilerAgent(),
    auditor: new AuditorAgent(),
  };

  async runPipeline(request: PipelineRequest): Promise<PipelineResult> {
    const templateId = uuidv4();
    const auditLog: WhatsAppTemplate["auditLog"] = [];

    try {
      const strategy = await this.agents.strategist.run(request);
      auditLog.push({ timestamp: new Date().toISOString(), agent: "strategist", status: "PASS", message: "Strategy defined" });

      const copy = await this.agents.copywriter.run({ strategy, businessContextId: request.businessContextId });
      auditLog.push({ timestamp: new Date().toISOString(), agent: "copywriter", status: "PASS", message: "Copy generated" });

      const review = await this.agents.policy_reviewer.run({ copy, businessContextId: request.businessContextId });
      if (!review.approved) {
        auditLog.push({ timestamp: new Date().toISOString(), agent: "policy_reviewer", status: "FAIL", message: "Policy violations found", details: { violations: review.violations } });
        return { templateId, template: this.buildDraftTemplate(templateId, request, copy.components, auditLog), auditReport: createPipelineStubAudit("Policy review failed", review.violations.map((v) => v.rule)), success: false, failedAt: "policy_reviewer" };
      }
      auditLog.push({ timestamp: new Date().toISOString(), agent: "policy_reviewer", status: "PASS", message: "All policies passed" });

      const compiled = await this.agents.compiler.run({ copy, request });
      auditLog.push({ timestamp: new Date().toISOString(), agent: "compiler", status: "PASS", message: "Template compiled" });

      const audit = await this.agents.auditor.run({ compiled });
      auditLog.push({ timestamp: new Date().toISOString(), agent: "auditor", status: audit.status === AuditReportStatus.Blocked ? "FAIL" : "PASS", message: audit.summary });

      const template = this.buildDraftTemplate(templateId, request, compiled.components, auditLog);
      return { templateId, template, auditReport: audit, success: true };
    } catch (err) {
      return {
        templateId,
        template: this.buildDraftTemplate(templateId, request, [], auditLog),
        auditReport: createPipelineStubAudit("Pipeline error", ["Pipeline failed before final audit."]),
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }
  }

  async runSingle(type: AgentType, input: unknown): Promise<unknown> {
    return (this.agents[type] as { run: (i: unknown) => Promise<unknown> }).run(input);
  }

  private buildDraftTemplate(id: string, request: PipelineRequest, components: WhatsAppTemplate["components"], auditLog: WhatsAppTemplate["auditLog"]): WhatsAppTemplate {
    return {
      id,
      name: `draft_${id.split("-")[0]}`,
      category: request.category ?? "UTILITY",
      language: request.language ?? "pt_BR",
      status: "DRAFT",
      components,
      businessContextId: request.businessContextId,
      auditLog,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
}

function createPipelineStubAudit(summary: string, blockingIssues: string[]): AuditReport {
  return {
    status: AuditReportStatus.Blocked,
    canSubmit: false,
    requiresHumanReview: true,
    riskLevel: PolicyRiskLevel.Critical,
    summary,
    checklist: [],
    blockingIssues,
    warnings: [],
    recommendedActions: ["Resolve pipeline errors before continuing."],
    reviewNotes: [],
    submissionGate: {
      allowed: false,
      reason: "Submission blocked by pipeline errors.",
      requiresExplicitConfirmation: true,
    },
  };
}
