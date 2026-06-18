import OpenAI from "openai";
import { z } from "zod";

const enabledLlmEnvSchema = z.object({
  LLM_API_KEY: z.string().min(1),
  LLM_BASE_URL: z.string().url(),
  LLM_MODEL: z.string().min(1),
});

export type LlmConfig =
  | {
      enabled: false;
    }
  | {
      enabled: true;
      apiKey: string;
      baseUrl: string;
      model: string;
    };

export function readLlmConfig(env: NodeJS.ProcessEnv = process.env): LlmConfig {
  const candidate = {
    LLM_API_KEY: readEnv(env.LLM_API_KEY),
    LLM_BASE_URL: readEnv(env.LLM_BASE_URL),
    LLM_MODEL: readEnv(env.LLM_MODEL),
  };

  const hasAnyLlmConfig = Object.values(candidate).some(Boolean);
  if (!hasAnyLlmConfig) {
    return { enabled: false };
  }

  const parsed = enabledLlmEnvSchema.safeParse(candidate);
  if (!parsed.success) {
    const missingOrInvalid = parsed.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new Error(`Invalid LLM environment configuration: ${missingOrInvalid}`);
  }

  return {
    enabled: true,
    apiKey: parsed.data.LLM_API_KEY,
    baseUrl: parsed.data.LLM_BASE_URL,
    model: parsed.data.LLM_MODEL,
  };
}

export function createOpenAiCompatibleClient(config: LlmConfig): OpenAI | undefined {
  if (!config.enabled) return undefined;

  return new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseUrl,
  });
}

export function describeLlmConfig(config: LlmConfig): string {
  if (!config.enabled) {
    return "disabled";
  }

  return `${config.model} via ${config.baseUrl}`;
}

function readEnv(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}
