import type { PipelineRequest, PipelineResponse } from "../types/pipeline";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001";

export async function createTemplateDraft(request: PipelineRequest): Promise<PipelineResponse> {
  const response = await fetch(`${API_BASE_URL}/pipeline/template/draft`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  const data = await response.json().catch(() => null) as PipelineResponse | null;

  if (!data) {
    return {
      success: false,
      errors: [{
        code: "network.invalid_response",
        message: "Backend returned an invalid response.",
      }],
    };
  }

  if (!response.ok && response.status !== 422) {
    return {
      ...data,
      success: false,
      errors: data.errors ?? [{
        code: `http.${response.status}`,
        message: "Request failed before the pipeline could return an auditable result.",
      }],
    };
  }

  return data;
}
