import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { MetaSubmissionService } from "../submission/index.js";

const MetaSubmissionRequestSchema = z.object({
  reviewSessionId: z.string().uuid(),
  approvalToken: z.string().min(1),
  compileChecksum: z.string().min(1),
  dryRun: z.boolean().default(true),
});

export async function submissionRoutes(app: FastifyInstance) {
  const service = new MetaSubmissionService();

  app.post("/submit", async (request, reply) => {
    const body = MetaSubmissionRequestSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({
        success: false,
        state: "FAILED",
        dryRun: true,
        validation: {
          valid: false,
          errors: [{ code: "submission.request.invalid", message: "Invalid submission request." }],
        },
        decisionTrace: [],
        artifacts: [],
        error: body.error.flatten(),
      });
    }

    const result = await service.submit(body.data);
    return reply.status(result.success ? 200 : 422).send(result);
  });
}
