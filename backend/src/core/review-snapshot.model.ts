import type { AuditReport } from "./audit-report.model.js";
import type { CampaignIntent } from "./campaign-intent.model.js";
import type { CommunicationStrategy } from "./communication-strategy.model.js";
import type { CopyBlockSet } from "./copy-block.model.js";
import type { MessageStructure } from "./message-structure.model.js";
import type { PolicyReview } from "./policy-review.model.js";
import type { SemanticTemplateModel, TemplateComponent } from "./template.model.js";
import type { ValidationResult } from "./semantic-template.validation.js";

export interface ReviewSnapshot {
  id: string;
  reviewSessionId: string;
  version: number;
  hash: string;
  immutable: true;
  campaignIntent: CampaignIntent;
  communicationStrategy: CommunicationStrategy;
  semanticTemplate: SemanticTemplateModel;
  messageStructure: MessageStructure;
  copyBlocks: CopyBlockSet;
  templateComponents: TemplateComponent[];
  validation: ValidationResult;
  policyReview: PolicyReview;
  auditReport: AuditReport;
  createdAt: string;
}

export interface ReviewSnapshotInput {
  reviewSessionId: string;
  version: number;
  campaignIntent: CampaignIntent;
  communicationStrategy: CommunicationStrategy;
  semanticTemplate: SemanticTemplateModel;
  messageStructure: MessageStructure;
  copyBlocks: CopyBlockSet;
  templateComponents: TemplateComponent[];
  validation: ValidationResult;
  policyReview: PolicyReview;
  auditReport: AuditReport;
}
