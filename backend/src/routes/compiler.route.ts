import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { MetaCompilerService } from "../compiler/index.js";

const MetaCompilerRequestSchema = z.object({
  reviewSessionId: z.string().uuid(),
  approvalToken: z.string().min(1),
});

export async function compilerRoutes(app: FastifyInstance) {
  const service = new MetaCompilerService();

  app.post("/meta", async (request, reply) => {
    const body = MetaCompilerRequestSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({
        success: false,
        compiled: false,
        validation: {
          valid: false,
          warnings: [],
          errors: [{ code: "compiler.request.invalid", message: "Invalid compiler request." }],
        },
        decisionTrace: [],
        artifacts: [],
        error: body.error.flatten(),
      });
    }

    const result = await service.compile(body.data);
    return reply.status(result.success ? 200 : 422).send(result);
  });
}
