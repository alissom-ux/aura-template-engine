import type {
  MetaApiClientConfig,
  MetaApiErrorResponse,
  MetaApiSuccessResponse,
} from "./meta-submission.types.js";
import type { MetaTemplatePayload } from "../compiler/index.js";

export interface MetaApiClientResult {
  success: boolean;
  response?: MetaApiSuccessResponse;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export class MetaApiClient {
  async submitTemplate(
    payload: MetaTemplatePayload,
    config: MetaApiClientConfig
  ): Promise<MetaApiClientResult> {
    const url = `https://graph.facebook.com/${config.graphVersion}/${config.wabaId}/message_templates`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const body = await response.json().catch(() => ({})) as MetaApiSuccessResponse | MetaApiErrorResponse;

      if (!response.ok) {
        return {
          success: false,
          error: {
            code: "meta_api.error",
            message: extractMetaErrorMessage(body),
            details: sanitizeMetaError(body),
          },
        };
      }

      return {
        success: true,
        response: body as MetaApiSuccessResponse,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: "meta_api.request_failed",
          message: error instanceof Error ? error.message : "Meta API request failed.",
        },
      };
    }
  }
}

function extractMetaErrorMessage(body: MetaApiSuccessResponse | MetaApiErrorResponse): string {
  const error = getMetaError(body);
  if (error?.message) return error.message;
  return "Meta API returned an error.";
}

function sanitizeMetaError(body: MetaApiSuccessResponse | MetaApiErrorResponse): unknown {
  const error = getMetaError(body);
  if (!error) return body;
  return {
    error: {
      message: error.message,
      type: error.type,
      code: error.code,
      error_subcode: error.error_subcode,
      fbtrace_id: error.fbtrace_id,
    },
  };
}

function getMetaError(body: MetaApiSuccessResponse | MetaApiErrorResponse): MetaApiErrorResponse["error"] | undefined {
  if (!("error" in body)) return undefined;
  const error = body.error;
  if (!error || typeof error !== "object") return undefined;
  return error;
}
