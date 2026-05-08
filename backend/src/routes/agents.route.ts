import type { FastifyInstance } from "fastify";
import { AgentOrchestrator } from "../agents/index.js";

const VALID_AGENTS = ["strategist", "copywriter", "policy_reviewer", "compiler", "auditor"] as const;
type ValidAgent = typeof VALID_AGENTS[number];

export async function agentRoutes(app: FastifyInstance) {
  const orchestrator = new AgentOrchestrator();

  // Run a single agent (useful for debugging and development)
  app.post("/:type/run", async (request, reply) => {
    const { type } = request.params as { type: string };

    if (!VALID_AGENTS.includes(type as ValidAgent)) {
      return reply.status(400).send({
        success: false,
        error: `Invalid agent type. Valid types: ${VALID_AGENTS.join(", ")}`,
      });
    }

    const result = await orchestrator.runSingle(type as ValidAgent, request.body);
    return { success: true, data: result };
  });
}
