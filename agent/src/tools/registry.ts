import { globalTools } from "./global.ts";
import { lifecycleTools } from "./lifecycle.ts";
import { collegeSearchTool } from "./college-search.ts";
import { careerExplorerTool } from "./career-explorer.ts";
import type { AnyToolDefinition } from "./types.ts";

const allTools = [...globalTools, ...lifecycleTools, collegeSearchTool, careerExplorerTool] satisfies AnyToolDefinition[];

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
