import type { AgentChannel, JsonObject, LifecycleStage } from "../agent/types.ts";

export interface ToolContext {
  userId: string;
  channel: AgentChannel;
  lifecycleStage: LifecycleStage;
}

export interface ToolDefinition<TInput extends JsonObject = JsonObject> {
  key: string;
  description: string;
  lifecycleStages?: LifecycleStage[];
  execute?: (input: TInput, context: ToolContext) => Promise<JsonObject>;
}
