import type { FastifyInstance } from "fastify";
import { BusinessContextSchema } from "../schemas/template.schema.js";
import { BusinessContextService } from "../services/business-context.service.js";

export async function businessContextRoutes(app: FastifyInstance) {
  const service = new BusinessContextService();

  app.post("/", async (request, reply) => {
    const body = BusinessContextSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ success: false, error: body.error.flatten() });
    }
    const result = await service.create(body.data);
    return reply.status(201).send({ success: true, data: result });
  });

  app.get("/", async () => {
    const contexts = await service.findAll();
    return { success: true, data: contexts };
  });

  app.get("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const context = await service.findById(id);
    if (!context) return reply.status(404).send({ success: false, error: "Business context not found" });
    return { success: true, data: context };
  });

  app.put("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await service.update(id, request.body as Parameters<typeof service.update>[1]);
    if (!result) return reply.status(404).send({ success: false, error: "Business context not found" });
    return { success: true, data: result };
  });
}
