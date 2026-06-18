import type { AgentChannel, LifecycleStage } from "./types.ts";
import type { LifecycleAgentProfile } from "./profiles/types.ts";
import { globalToolKeys, resolveTools } from "../tools/registry.ts";

interface ToolBundleInput {
  channel: AgentChannel;
  lifecycleStage: LifecycleStage;
  profile: LifecycleAgentProfile;
  currentIntent?: string;
}

const channelToolKeys: Partial<Record<AgentChannel, string[]>> = {
  gmail: ["send_email_summary"],
  imessage: [],
  sms: [],
  website: [],
  mobile_app: [],
};

const intentToolKeys: Record<string, string[]> = {
  application: ["application_deadline_tracker", "essay_feedback"],
  career: ["career_interest_quiz"],
  college_search: ["lookup_college", "college_match_search"],
  financial_aid: ["fafsa_checklist"],
  transfer: ["credit_transfer_estimator", "major_requirement_compare"],
};

export function assembleToolBundle(input: ToolBundleInput) {
  const selectedKeys = [
    ...globalToolKeys,
    ...input.profile.toolKeys,
    ...(input.currentIntent ? intentToolKeys[input.currentIntent] ?? [] : []),
    ...(channelToolKeys[input.channel] ?? []),
  ];

  const tools = resolveTools(selectedKeys).filter(
    (tool) => !tool.lifecycleStages || tool.lifecycleStages.includes(input.lifecycleStage),
  );

  return {
    selectedToolKeys: tools.map((tool) => tool.key),
    tools,
  };
}
