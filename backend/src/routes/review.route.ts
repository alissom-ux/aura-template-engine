import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { ReviewService } from "../review/index.js";

const ReviewActionRequestSchema = z.object({
  reviewer: z.string().min(1),
  comment: z.string().optional(),
  snapshotHash: z.string().min(1),
  snapshotVersion: z.number().int().positive(),
});

export async function reviewRoutes(app: FastifyInstance) {
  const service = new ReviewService();

  app.post("/:sessionId/approve", async (request, reply) => {
    const parsed = parseRequest(request.body);
    if (!parsed.success) return reply.status(400).send(parsed.response);

    const { sessionId } = request.params as { sessionId: string };
    return sendReviewResult(reply, await service.approve(sessionId, parsed.data));
  });

  app.post("/:sessionId/reject", async (request, reply) => {
    const parsed = parseRequest(request.body);
    if (!parsed.success) return reply.status(400).send(parsed.response);

    const { sessionId } = request.params as { sessionId: string };
    return sendReviewResult(reply, await service.reject(sessionId, parsed.data));
  });

  app.post("/:sessionId/request-changes", async (request, reply) => {
    const parsed = parseRequest(request.body);
    if (!parsed.success) return reply.status(400).send(parsed.response);

    const { sessionId } = request.params as { sessionId: string };
    return sendReviewResult(reply, await service.requestChanges(sessionId, parsed.data));
  });
}

function parseRequest(body: unknown) {
  const parsed = ReviewActionRequestSchema.safeParse(body);
  if (!parsed.success) {
    return {
      success: false as const,
      response: {
        success: false,
        error: parsed.error.flatten(),
      },
    };
  }

  return {
    success: true as const,
    data: parsed.data,
  };
}

function sendReviewResult(
  reply: { status: (code: number) => { send: (payload: unknown) => unknown } },
  result: Awaited<ReturnType<ReviewService["approve"]>>
) {
  if (result.success) {
    return reply.status(200).send(result);
  }

  const statusCode = result.error?.code === "review.session_not_found" ? 404 : 409;
  return reply.status(statusCode).send(result);
}
