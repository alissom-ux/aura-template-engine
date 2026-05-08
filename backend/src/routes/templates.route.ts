import type { FastifyInstance } from "fastify";
import { GenerateTemplateRequestSchema } from "../schemas/template.schema.js";
import { TemplateService } from "../services/template.service.js";

export async function templateRoutes(app: FastifyInstance) {
  const service = new TemplateService();

  app.post("/generate", async (request, reply) => {
    const body = GenerateTemplateRequestSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ success: false, error: body.error.flatten() });
    }
    const result = await service.generate(body.data);
    return reply.status(result.success ? 201 : 422).send(result);
  });

  app.get("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const template = await service.findById(id);
    if (!template) return reply.status(404).send({ success: false, error: "Template not found" });
    return { success: true, data: template };
  });

  app.get("/", async (request) => {
    const { businessContextId, status } = request.query as Record<string, string>;
    const templates = await service.findAll({ businessContextId, status });
    return { success: true, data: templates };
  });

  app.patch("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await service.update(id, request.body as Parameters<typeof service.update>[1]);
    if (!result) return reply.status(404).send({ success: false, error: "Template not found" });
    return { success: true, data: result };
  });

  app.post("/:id/submit", async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await service.submitToMeta(id);
    if (!result.success) return reply.status(422).send(result);
    return reply.status(200).send(result);
  });
}
