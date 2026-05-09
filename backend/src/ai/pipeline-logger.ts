export interface PipelineLogContext {
  executionId?: string;
  agent?: string;
  stage: string;
  detail?: Record<string, unknown>;
}

export class PipelineLogger {
  info(context: PipelineLogContext): void {
    console.info(JSON.stringify(createEntry("info", context)));
  }

  warn(context: PipelineLogContext): void {
    console.warn(JSON.stringify(createEntry("warn", context)));
  }

  error(context: PipelineLogContext & { error?: unknown }): void {
    console.error(JSON.stringify(createEntry("error", {
      ...context,
      detail: {
        ...context.detail,
        error: serializeError(context.error),
      },
    })));
  }
}

function createEntry(level: string, context: PipelineLogContext) {
  return {
    level,
    component: "aura-template-engine",
    timestamp: new Date().toISOString(),
    ...context,
  };
}

function serializeError(error: unknown): unknown {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }
  return error;
}
