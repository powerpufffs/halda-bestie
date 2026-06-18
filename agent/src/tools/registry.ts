import { globalTools } from "./global.ts";
import { lifecycleTools } from "./lifecycle.ts";
import type { ToolDefinition } from "./types.ts";

const allTools = [...globalTools, ...lifecycleTools];

export const toolRegistry = new Map(allTools.map((tool) => [tool.key, tool]));

export function resolveTools(toolKeys: string[]): ToolDefinition[] {
  const seen = new Set<string>();
  const resolved: ToolDefinition[] = [];

  for (const key of toolKeys) {
    if (seen.has(key)) continue;

    const tool = toolRegistry.get(key);
    if (!tool) continue;

    seen.add(key);
    resolved.push(tool);
  }

  return resolved;
}

export const globalToolKeys = globalTools.map((tool) => tool.key);
