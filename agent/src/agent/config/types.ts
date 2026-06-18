import type { AnyToolDefinition, LlmToolDefinition } from "../../tools/types.ts";
import type { TriageIntent } from "../triage.ts";
import type { LifecycleStage } from "../types.ts";

export type AgentProfileName = "visitor" | "freshman" | "sophomore" | "junior" | "senior" | "college";

export type ToolKey =
  | "activities_list_coach"
  | "application_deadline_tracker"
  | "build_10th_grade_plan"
  | "build_junior_timeline"
  | "career_interest_quiz"
  | "college_match_search"
  | "complete_open_loop"
  | "create_open_loop"
  | "credit_transfer_estimator"
  | "decision_aid_compare"
  | "essay_feedback"
  | "fafsa_checklist"
  | "interview_prep"
  | "log_agent_event"
  | "lookup_college"
  | "major_requirement_compare"
  | "save_profile_fact"
  | "list_email_action_items"
  | "send_email_summary"
  | "search_user_email"
  | "unknown_onboarding"
  | "update_communication_style"
  | "update_user_profile";

export type TriggerCondition =
  | "default"
  | "activities_or_resume_signal"
  | "application_essay_or_deadline_signal"
  | "career_or_major_signal"
  | "college_or_program_search_signal"
  | "cost_or_scholarship_signal"
  | "essay_or_personal_statement_signal"
  | "email_or_inbox_signal"
  | "interview_signal"
  | "offer_decision_signal"
  | "transfer_credit_or_current_college_signal";

export type FulfillmentCondition =
  | "profile.role_known"
  | "profile.lifecycle_stage_known"
  | "profile.interests_or_target_majors_present"
  | "profile.target_schools_present"
  | "profile.college_search_direction_present"
  | "profile.college_search_region_present"
  | "profile.college_search_budget_present"
  | "profile.college_search_gpa_present"
  | "profile.next_deadline_checked"
  | "profile.first_plan_created"
  | "profile.current_institution_present"
  | "profile.transfer_credit_risk_checked";

export type AgentPriorityName =
  | "collect_person_context"
  | "collect_lifecycle_stage"
  | "collect_interest_area"
  | "build_first_plan"
  | "collect_target_schools"
  | "collect_college_search_direction"
  | "collect_college_search_region"
  | "collect_college_search_budget"
  | "collect_college_search_gpa"
  | "check_nearest_deadline"
  | "collect_current_institution"
  | "check_credit_risk";

export interface IntentConfig<Name extends TriageIntent = TriageIntent> {
  name: Name;
  tools: readonly ToolKey[];
  triggerCondition: TriggerCondition;
  description?: string;
  promptDirective?: string;
}

export interface AgentPriorityConfig {
  name: AgentPriorityName;
  description: string;
  fulfillmentCondition: FulfillmentCondition;
  prompt: string;
  priority: number;
  blocking?: boolean;
  tool?: ToolKey;
  appliesToIntents?: readonly TriageIntent[];
}

export interface ProfileConfig {
  name: AgentProfileName;
  lifecycleStages: readonly LifecycleStage[];
  systemPrompt: string;
  possibleIntents: readonly IntentConfig[];
  agentPriorities: readonly AgentPriorityConfig[];
  alwaysOnTools: readonly ToolKey[];
  toneRules: readonly string[];
  defaultGoals: readonly string[];
  defaultOpenLoops: readonly string[];
  milestoneModel: readonly string[];
  riskFlags: readonly string[];
  demoSuccessCriteria: readonly string[];
}

export interface AgentConfig {
  profiles: readonly ProfileConfig[];
}

export interface ResolvedIntentConfig extends Omit<IntentConfig, "tools"> {
  toolKeys: ToolKey[];
  tools: AnyToolDefinition[];
  toolCallDefinitions: LlmToolDefinition[];
}

export interface ResolvedProfileRuntime {
  profile: ProfileConfig;
  activeIntent: ResolvedIntentConfig;
  activePriority?: AgentPriorityConfig;
}
