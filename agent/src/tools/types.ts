import type { z } from "zod";
import type { AgentStateStore } from "../agent/state-store.ts";
import type { AgentChannel, JsonObject, LifecycleStage } from "../agent/types.ts";

export interface ToolContext {
  userId: string;
  threadId?: string;
  channel: AgentChannel;
  lifecycleStage: LifecycleStage;
  store: AgentStateStore;
  timestamp: Date;
}

export interface ToolDefinition<TInput extends JsonObject = JsonObject, TOutput extends JsonObject = JsonObject> {
  key: string;
  description: string;
  inputSchema: z.ZodType<TInput>;
  lifecycleStages?: LifecycleStage[];
  execute: (input: TInput, context: ToolContext) => Promise<TOutput>;
}

export type ToolInput<TTool extends ToolDefinition> = TTool extends ToolDefinition<infer TInput> ? TInput : never;

export type AnyToolDefinition = ToolDefinition<any, JsonObject>;

export interface LlmToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: JsonObject;
  };
}

export function defineTool<TInput extends JsonObject, TOutput extends JsonObject = JsonObject>(
  tool: ToolDefinition<TInput, TOutput>,
): ToolDefinition<TInput, TOutput> {
  return tool;
}
