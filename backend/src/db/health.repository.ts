import { prisma } from "./prisma.client.js";

export class DatabaseHealthRepository {
  async check(): Promise<{ ok: true }> {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true };
  }
}
