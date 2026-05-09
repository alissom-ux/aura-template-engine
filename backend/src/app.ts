import Fastify from "fastify";
import cors from "@fastify/cors";
import { templateRoutes } from "./routes/templates.route.js";
import { businessContextRoutes } from "./routes/business-contexts.route.js";
import { agentRoutes } from "./routes/agents.route.js";
import { pipelineRoutes } from "./routes/pipeline.route.js";
import { reviewRoutes } from "./routes/review.route.js";
import { compilerRoutes } from "./routes/compiler.route.js";
import { submissionRoutes } from "./routes/submission.route.js";
import { DatabaseHealthRepository } from "./db/index.js";

export function buildApp() {
  const app = Fastify({
    logger: true,
  });
  const databaseHealth = new DatabaseHealthRepository();

  app.register(cors, {
    origin: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  });

  app.get("/health", async () => ({ status: "ok", version: "0.1.0" }));
  app.get("/health/db", async (_request, reply) => {
    try {
      const database = await databaseHealth.check();
      return {
        status: "ok",
        database: "connected",
        schema: "template_engine",
        reviewRepository: database.reviewRepository,
      };
    } catch (error) {
      app.log.error(error);
      return reply.status(503).send({
        status: "error",
        database: "unavailable",
      });
    }
  });

  app.register(templateRoutes, { prefix: "/api/templates" });
  app.register(businessContextRoutes, { prefix: "/api/business-contexts" });
  app.register(agentRoutes, { prefix: "/api/agents" });
  app.register(pipelineRoutes, { prefix: "/pipeline" });
  app.register(reviewRoutes, { prefix: "/pipeline/review" });
  app.register(compilerRoutes, { prefix: "/pipeline/compiler" });
  app.register(submissionRoutes, { prefix: "/pipeline/meta" });

  return app;
}
