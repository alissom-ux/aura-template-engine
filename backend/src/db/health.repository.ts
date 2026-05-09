import { prisma } from "./prisma.client.js";
import { DEFAULT_TENANT_ID } from "../config/env.js";
import { ReviewSessionRepository } from "../repositories/review-session.repository.js";

export class DatabaseHealthRepository {
  private readonly reviewSessions = new ReviewSessionRepository();

  async check(): Promise<{ ok: true; reviewRepository: "ok" }> {
    await prisma.$queryRaw`SELECT 1`;
    await this.reviewSessions.assertAccessible(DEFAULT_TENANT_ID);
    return { ok: true, reviewRepository: "ok" };
  }
}
