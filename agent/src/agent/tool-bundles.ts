import type { AgentChannel, LifecycleStage } from "./types.ts";
import type { LifecycleAgentProfile } from "./profiles/types.ts";
import type { TriageIntent } from "./triage.ts";
import type { IntentConfig, ResolvedIntentConfig, ToolKey } from "./config/types.ts";
import { toLlmToolDefinitions } from "../tools/llm-adapter.ts";
import { resolveTools } from "../tools/registry.ts";

interface ToolBundleInput {
  channel: AgentChannel;
  lifecycleStage: LifecycleStage;
  profile: LifecycleAgentProfile;
  currentIntent: TriageIntent;
}

const channelToolKeys: Partial<Record<AgentChannel, string[]>> = {
  email: [],
  gmail: [],
  imessage: [],
  sms: [],
  website: [],
  mobile_app: [],
  terminal: [],
};

export function assembleToolBundle(input: ToolBundleInput) {
  const intent = resolveIntentConfig(input.profile, input.currentIntent);
  const selectedKeys = intent.name === "chat"
    ? []
    : [
        ...input.profile.alwaysOnTools,
        ...intent.tools,
        ...(channelToolKeys[input.channel] ?? []),
      ];

  const resolvedTools = resolveTools(selectedKeys);
  assertAllToolKeysResolved(selectedKeys, resolvedTools);

  const tools = resolvedTools.filter(
    (tool) => !tool.lifecycleStages || tool.lifecycleStages.includes(input.lifecycleStage),
  );
  const toolCallDefinitions = toLlmToolDefinitions(tools);

  return {
    selectedToolKeys: tools.map((tool) => tool.key),
    toolCallDefinitions,
    tools,
    activeIntent: {
      ...intent,
      toolKeys: tools.map((tool) => tool.key as ToolKey),
      tools,
      toolCallDefinitions,
    } satisfies ResolvedIntentConfig,
  };
}

function assertAllToolKeysResolved(
  selectedKeys: readonly string[],
  tools: ReturnType<typeof resolveTools>,
): void {
  const resolvedKeys = new Set(tools.map((tool) => tool.key));
  const missingKeys = [...new Set(selectedKeys)].filter((key) => !resolvedKeys.has(key));
  if (missingKeys.length === 0) return;

  throw new Error(`Agent config references unknown tool key(s): ${missingKeys.join(", ")}`);
}

function resolveIntentConfig(profile: LifecycleAgentProfile, intent: TriageIntent): IntentConfig {
  return (
    profile.possibleIntents.find((candidate) => candidate.name === intent) ??
    profile.possibleIntents.find((candidate) => candidate.name === "chat") ??
    {
      name: "chat",
      tools: [],
      triggerCondition: "default",
    }
  );
}
