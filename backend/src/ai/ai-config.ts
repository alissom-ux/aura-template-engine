export const RuntimeMode = {
  Dev: "DEV",
  Prod: "PROD",
} as const;

export type RuntimeMode = (typeof RuntimeMode)[keyof typeof RuntimeMode];

export const AiMode = {
  OpenAI: "openai",
  Deterministic: "deterministic",
} as const;

export type AiMode = (typeof AiMode)[keyof typeof AiMode];

export interface AiConfig {
  runtimeMode: RuntimeMode;
  aiMode: AiMode;
  model: string;
  temperature: number;
  timeoutMs: number;
  openAiApiKey?: string;
}

export function readAiConfig(): AiConfig {
  return {
    runtimeMode: readRuntimeMode(),
    aiMode: readAiMode(),
    model: process.env.OPENAI_MODEL ?? "gpt-5.5-mini",
    temperature: parseNumber(process.env.AURA_AI_TEMPERATURE, 0.3),
    timeoutMs: parseNumber(process.env.AURA_AI_TIMEOUT_MS, 30_000),
    openAiApiKey: process.env.OPENAI_API_KEY,
  };
}

function readRuntimeMode(): RuntimeMode {
  return process.env.AURA_RUNTIME_MODE === RuntimeMode.Prod ? RuntimeMode.Prod : RuntimeMode.Dev;
}

function readAiMode(): AiMode {
  if (process.env.AURA_AI_MODE === AiMode.Deterministic) return AiMode.Deterministic;
  return AiMode.OpenAI;
}

function parseNumber(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
