import { v4 as uuidv4 } from "uuid";
import type {
  WhatsAppTemplate,
  PipelineRequest,
  PipelineResult,
} from "../types/index.js";
import { AgentOrchestrator } from "../agents/index.js";

// In-memory store (replace with Supabase in Phase 4)
const store = new Map<string, WhatsAppTemplate>();

export class TemplateService {
  private orchestrator = new AgentOrchestrator();

  async generate(request: PipelineRequest): Promise<PipelineResult> {
    return this.orchestrator.runPipeline(request);
  }

  async findById(id: string): Promise<WhatsAppTemplate | null> {
    return store.get(id) ?? null;
  }

  async findAll(filters: { businessContextId?: string; status?: string }): Promise<WhatsAppTemplate[]> {
    const all = Array.from(store.values());
    return all.filter((t) => {
      if (filters.businessContextId && t.businessContextId !== filters.businessContextId) return false;
      if (filters.status && t.status !== filters.status) return false;
      return true;
    });
  }

  async update(id: string, data: Partial<WhatsAppTemplate>): Promise<WhatsAppTemplate | null> {
    const existing = store.get(id);
    if (!existing) return null;
    if (existing.status !== "DRAFT") throw new Error("Only DRAFT templates can be updated");
    const updated = { ...existing, ...data, id, updatedAt: new Date().toISOString() };
    store.set(id, updated);
    return updated;
  }

  async submitToMeta(id: string): Promise<{ success: boolean; data?: unknown; error?: string }> {
    const template = store.get(id);
    if (!template) return { success: false, error: "Template not found" };
    // Meta API integration — to be implemented in Phase 3
    return {
      success: false,
      error: "Legacy in-memory template submission is disabled. Use /pipeline/compiler/meta and /pipeline/meta/submit.",
    };
  }
}
