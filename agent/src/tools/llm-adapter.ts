import { z } from "zod";
import type { JsonObject } from "../agent/types.ts";
import { toolRegistry } from "./registry.ts";
import type { AnyToolDefinition, LlmToolDefinition, ToolContext } from "./types.ts";

interface ExecuteToolCallInput {
  name: string;
  arguments: unknown;
  context: ToolContext;
}

export async function executeToolCall(input: ExecuteToolCallInput): Promise<JsonObject> {
  const tool = toolRegistry.get(input.name);

  if (!tool) {
    return {
      ok: false,
      error: "unknown_tool",
      toolName: input.name,
    };
  }

  const parsed = tool.inputSchema.safeParse(input.arguments);
  if (!parsed.success) {
    return {
      ok: false,
      error: "invalid_tool_arguments",
      toolName: input.name,
      issues: parsed.error.issues,
    };
  }

  const output = await tool.execute(parsed.data, input.context);

  return {
    ok: true,
    toolName: input.name,
    output,
  };
}

export function toLlmToolDefinitions(tools: AnyToolDefinition[]): LlmToolDefinition[] {
  return tools.map((tool) => ({
    type: "function",
    function: {
      name: tool.key,
      description: tool.description,
      parameters: z.toJSONSchema(tool.inputSchema) as JsonObject,
    },
  }));
}
