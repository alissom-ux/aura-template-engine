import OpenAI from "openai";
import { AiMode, readAiConfig } from "./ai-config.js";
import { PipelineLogger } from "./pipeline-logger.js";

export interface JsonCompletionResult<T> {
  output: T | null;
  usedModel?: string;
  skipped: boolean;
  warnings: string[];
}

export class OpenAiJsonClient {
  private readonly config = readAiConfig();
  private readonly logger = new PipelineLogger();
  private readonly client = this.config.openAiApiKey
    ? new OpenAI({ apiKey: this.config.openAiApiKey, timeout: this.config.timeoutMs })
    : null;

  async completeJson<T>(input: {
    agent: string;
    systemPrompt: string;
    userPayload: unknown;
    fallbackLabel: string;
  }): Promise<JsonCompletionResult<T>> {
    if (this.config.aiMode === AiMode.Deterministic) {
      return {
        output: null,
        skipped: true,
        warnings: [`${input.agent}: AURA_AI_MODE=deterministic; using deterministic fallback.`],
      };
    }

    if (!this.client) {
      return {
        output: null,
        skipped: true,
        warnings: [`${input.agent}: OPENAI_API_KEY is missing; using ${input.fallbackLabel}.`],
      };
    }

    try {
      this.logger.info({
        agent: input.agent,
        stage: "openai.request",
        detail: {
          model: this.config.model,
          temperature: this.config.temperature,
        },
      });

      const response = await this.client.chat.completions.create({
        model: this.config.model,
        temperature: this.config.temperature,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: input.systemPrompt },
          { role: "user", content: JSON.stringify(input.userPayload) },
        ],
      } as never);

      const content = response.choices[0]?.message?.content;
      if (!content) {
        return {
          output: null,
          usedModel: this.config.model,
          skipped: false,
          warnings: [`${input.agent}: OpenAI returned an empty response; using ${input.fallbackLabel}.`],
        };
      }

      return {
        output: JSON.parse(content) as T,
        usedModel: this.config.model,
        skipped: false,
        warnings: [],
      };
    } catch (error) {
      this.logger.error({
        agent: input.agent,
        stage: "openai.error",
        error,
      });
      return {
        output: null,
        usedModel: this.config.model,
        skipped: false,
        warnings: [`${input.agent}: OpenAI call failed; using ${input.fallbackLabel}.`],
      };
    }
  }
}
