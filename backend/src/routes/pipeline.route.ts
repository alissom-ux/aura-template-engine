import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { TemplateCategory } from "../core/index.js";
import { TemplatePipelineOrchestrator } from "../pipeline/index.js";

const DraftTemplateRequestSchema = z.object({
  userPrompt: z.string().min(10),
  businessContext: z.object({
    companyName: z.string().min(1),
    industry: z.string().min(1),
    brandVoice: z.string().min(1),
    description: z.string().optional(),
    audience: z.string().optional(),
    complianceNotes: z.string().optional(),
  }),
  defaults: z.object({
    category: z.enum([
      TemplateCategory.Marketing,
      TemplateCategory.Utility,
      TemplateCategory.Authentication,
    ]).optional(),
    language: z.string().min(2).optional(),
  }).optional(),
});

export async function pipelineRoutes(app: FastifyInstance) {
  const orchestrator = new TemplatePipelineOrchestrator();

  app.post("/template/draft", async (request, reply) => {
    const body = DraftTemplateRequestSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({
        success: false,
        error: body.error.flatten(),
      });
    }

    const result = await orchestrator.createDraft(body.data);
    return reply.status(result.success ? 200 : 422).send(result);
  });
}
