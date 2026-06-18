import { emailTools } from "./email.ts";
import { globalTools } from "./global.ts";
import { lifecycleTools } from "./lifecycle.ts";
import { seniorApplicationTools } from "./senior-application.ts";
import type { AnyToolDefinition } from "./types.ts";

const allTools = [...globalTools, ...lifecycleTools, ...seniorApplicationTools, ...emailTools] satisfies AnyToolDefinition[];

export const toolRegistry: Map<string, AnyToolDefinition> = new Map(allTools.map((tool) => [tool.key, tool]));

export function resolveTools(toolKeys: string[]): AnyToolDefinition[] {
  const seen = new Set<string>();
  const resolved: AnyToolDefinition[] = [];

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
