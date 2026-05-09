import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { TemplateCategory } from "../core/index.js";
import { TemplatePipelineOrchestrator } from "../pipeline/index.js";
import { TemplatePersistenceService } from "../services/template-persistence.service.js";

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
  const persistence = new TemplatePersistenceService();

  app.post("/template/draft", async (request, reply) => {
    const body = DraftTemplateRequestSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({
        success: false,
        error: body.error.flatten(),
      });
    }

    const result = await orchestrator.createDraft(body.data);

    try {
      const persisted = await persistence.persistDraft(body.data, result);
      return reply.status(result.success ? 200 : 422).send({
        ...result,
        persistence: {
          saved: true,
          ...persisted,
        },
      });
    } catch (error) {
      request.log.error({ error }, "Failed to persist template draft.");
      return reply.status(result.success ? 200 : 422).send({
        ...result,
        persistence: {
          saved: false,
          error: "draft_persistence_failed",
        },
      });
    }
  });
}
