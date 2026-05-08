import { z } from "zod";
import {
  AgentType,
  AuditStatus,
  BusinessExampleType,
  BusinessPolicySeverity,
  ButtonType,
  HeaderFormat,
  SemanticComponentRole,
  TemplateCategory,
  TemplateComponentType,
  TemplateStatus,
  TonePrimary,
} from "./enums.js";

export const TemplateCategorySchema = z.enum([
  TemplateCategory.Marketing,
  TemplateCategory.Utility,
  TemplateCategory.Authentication,
]);

export const TemplateStatusSchema = z.enum([
  TemplateStatus.Draft,
  TemplateStatus.PendingReview,
  TemplateStatus.ApprovedInternal,
  TemplateStatus.RejectedInternal,
  TemplateStatus.PendingMeta,
  TemplateStatus.Approved,
  TemplateStatus.Rejected,
  TemplateStatus.Paused,
  TemplateStatus.Archived,
]);

export const TemplateVariableSchema = z.object({
  index: z.number().int().positive(),
  name: z.string().min(1),
  description: z.string().min(1),
  example: z.string().min(1),
  required: z.boolean(),
  source: z.enum(["user", "business_context", "agent", "system"]).optional(),
});

export const HeaderComponentSchema = z.object({
  type: z.literal(TemplateComponentType.Header),
  format: z.enum([
    HeaderFormat.Text,
    HeaderFormat.Image,
    HeaderFormat.Video,
    HeaderFormat.Document,
  ]),
  text: z.string().max(60).optional(),
  example: z.object({ header_handle: z.array(z.string()).optional() }).optional(),
});

export const BodyComponentSchema = z.object({
  type: z.literal(TemplateComponentType.Body),
  text: z.string().min(1).max(1024),
  example: z.object({ body_text: z.array(z.array(z.string())) }).optional(),
});

export const FooterComponentSchema = z.object({
  type: z.literal(TemplateComponentType.Footer),
  text: z.string().min(1).max(60),
});

export const ButtonSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal(ButtonType.QuickReply),
    text: z.string().min(1).max(25),
  }),
  z.object({
    type: z.literal(ButtonType.Url),
    text: z.string().min(1).max(25),
    url: z.string().url(),
    example: z.array(z.string()).optional(),
  }),
  z.object({
    type: z.literal(ButtonType.PhoneNumber),
    text: z.string().min(1).max(25),
    phone_number: z.string().min(1),
  }),
  z.object({
    type: z.literal(ButtonType.CopyCode),
    example: z.string().min(1),
  }),
]);

export const ButtonsComponentSchema = z.object({
  type: z.literal(TemplateComponentType.Buttons),
  buttons: z.array(ButtonSchema).min(1).max(3),
});

export const TemplateComponentSchema = z.discriminatedUnion("type", [
  HeaderComponentSchema,
  BodyComponentSchema,
  FooterComponentSchema,
  ButtonsComponentSchema,
]);

export const SemanticComponentSchema = z.object({
  id: z.string().min(1),
  role: z.enum([
    SemanticComponentRole.BrandIdentification,
    SemanticComponentRole.MainMessage,
    SemanticComponentRole.Context,
    SemanticComponentRole.Disclaimer,
    SemanticComponentRole.CallToAction,
    SemanticComponentRole.UserChoice,
    SemanticComponentRole.SecurityCode,
  ]),
  componentType: z.enum([
    TemplateComponentType.Header,
    TemplateComponentType.Body,
    TemplateComponentType.Footer,
    TemplateComponentType.Buttons,
  ]),
  text: z.string().optional(),
  required: z.boolean(),
  notes: z.string().optional(),
});

export const SemanticTemplateModelSchema = z.object({
  intent: z.object({
    rawInput: z.string().min(1),
    normalizedGoal: z.string().min(1),
    category: TemplateCategorySchema,
    language: z.string().min(2),
    businessContextId: z.string().uuid(),
  }),
  message: z.object({
    objective: z.string().min(1),
    audienceDescription: z.string().optional(),
    components: z.array(SemanticComponentSchema),
  }),
  variableBindings: z.array(z.object({
    variable: TemplateVariableSchema,
    appearsIn: z.array(z.enum([
      TemplateComponentType.Header,
      TemplateComponentType.Body,
      TemplateComponentType.Footer,
      TemplateComponentType.Buttons,
    ])).min(1),
    semanticPurpose: z.string().min(1),
  })),
  constraints: z.array(z.object({
    id: z.string().min(1),
    source: z.enum(["meta_policy", "business_policy", "system", "agent"]),
    description: z.string().min(1),
    severity: z.enum([
      BusinessPolicySeverity.Block,
      BusinessPolicySeverity.Warn,
    ]),
  })),
});

export const AuditEntrySchema = z.object({
  timestamp: z.string().datetime(),
  agent: z.enum([
    AgentType.Strategist,
    AgentType.Copywriter,
    AgentType.PolicyReviewer,
    AgentType.Compiler,
    AgentType.Auditor,
  ]),
  status: z.enum([AuditStatus.Pass, AuditStatus.Fail, AuditStatus.Warning]),
  message: z.string().min(1),
  details: z.record(z.unknown()).optional(),
});

export const WhatsAppTemplateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().regex(/^[a-z0-9_]+$/).max(512),
  category: TemplateCategorySchema,
  language: z.string().min(2),
  status: TemplateStatusSchema,
  components: z.array(TemplateComponentSchema),
  businessContextId: z.string().uuid(),
  semanticModel: SemanticTemplateModelSchema.optional(),
  variables: z.array(TemplateVariableSchema).optional(),
  metaTemplateId: z.string().optional(),
  auditLog: z.array(AuditEntrySchema),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const GenerateTemplateRequestSchema = z.object({
  intent: z.string().min(10, "Intent must be descriptive (min 10 chars)"),
  businessContextId: z.string().uuid(),
  category: TemplateCategorySchema.optional(),
  language: z.string().default("pt_BR"),
});

export const BusinessContextSchema = z.object({
  name: z.string().min(1),
  segment: z.string().min(1),
  description: z.string().min(10),
  tone: z.object({
    primary: z.enum([
      TonePrimary.Formal,
      TonePrimary.Informal,
      TonePrimary.Technical,
      TonePrimary.Empathetic,
      TonePrimary.Urgency,
    ]),
    avoid: z.array(z.string()),
    guidelines: z.string(),
  }),
  audience: z.object({
    description: z.string(),
    ageRange: z.string().optional(),
    painPoints: z.array(z.string()),
    expectations: z.array(z.string()),
  }),
  policies: z.array(z.object({
    id: z.string(),
    rule: z.string(),
    reason: z.string().optional(),
    severity: z.enum([
      BusinessPolicySeverity.Block,
      BusinessPolicySeverity.Warn,
    ]),
  })),
  examples: z.array(z.object({
    type: z.enum([
      BusinessExampleType.ApprovedTemplate,
      BusinessExampleType.CommunicationSample,
    ]),
    content: z.string(),
    notes: z.string().optional(),
  })),
  complianceNotes: z.string().optional(),
  metaWabaId: z.string().optional(),
});
