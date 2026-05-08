import { v4 as uuidv4 } from "uuid";
import type { BusinessContext } from "../types/index.js";
import type { z } from "zod";
import type { BusinessContextSchema } from "../schemas/template.schema.js";

type CreateInput = z.infer<typeof BusinessContextSchema>;

// In-memory store (replace with Supabase in Phase 4)
const store = new Map<string, BusinessContext>();

export class BusinessContextService {
  async create(data: CreateInput): Promise<BusinessContext> {
    const context: BusinessContext = {
      ...data,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
    };
    store.set(context.id, context);
    return context;
  }

  async findById(id: string): Promise<BusinessContext | null> {
    return store.get(id) ?? null;
  }

  async findAll(): Promise<BusinessContext[]> {
    return Array.from(store.values());
  }

  async update(id: string, data: Partial<BusinessContext>): Promise<BusinessContext | null> {
    const existing = store.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...data, id };
    store.set(id, updated);
    return updated;
  }
}
