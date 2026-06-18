import type { ToolDefinition } from "./types.ts";

export const globalTools = [
  {
    key: "save_profile_fact",
    description: "Persist a stable fact, interest, preference, or constraint about the student.",
  },
  {
    key: "update_user_profile",
    description: "Update the student's materialized profile after a meaningful turn.",
  },
  {
    key: "create_open_loop",
    description: "Track a pending question, follow-up, or unresolved conversational obligation.",
  },
  {
    key: "complete_open_loop",
    description: "Mark a pending conversational obligation as answered or no longer needed.",
  },
  {
    key: "log_agent_event",
    description: "Audit a classification, profile update, tool call, or agent decision.",
  },
  {
    key: "lookup_college",
    description: "Look up real institution facts from a college data source.",
  },
  {
    key: "send_email_summary",
    description: "Send a student or counselor-friendly summary by email.",
  },
] satisfies ToolDefinition[];
