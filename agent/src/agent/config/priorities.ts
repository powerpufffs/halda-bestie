import type { AgentPriorityConfig } from "./types.ts";

export const collectPersonContextPriority: AgentPriorityConfig = {
  name: "collect_person_context",
  description: "Learn whether this person is a student, supporter, counselor, institution staff, or not college-bound.",
  fulfillmentCondition: "profile.role_known",
  prompt: "are you a student looking at college, helping someone, or not really looking at college?",
  priority: 30,
  tool: "create_open_loop",
};

export const collectLifecycleStagePriority: AgentPriorityConfig = {
  name: "collect_lifecycle_stage",
  description: "Learn the student's grade, transfer status, current college status, or gap-year status.",
  fulfillmentCondition: "profile.lifecycle_stage_known",
  prompt: "what grade/year are you - 9th, 10th, 11th, 12th, transfer, already in college, or something else?",
  priority: 20,
  tool: "create_open_loop",
};

export const collectInterestAreaPriority: AgentPriorityConfig = {
  name: "collect_interest_area",
  description: "Learn one possible career, major, subject, or work vibe the student wants to explore.",
  fulfillmentCondition: "profile.interests_or_target_majors_present",
  prompt: "what kind of work or subject sounds least boring to you right now?",
  priority: 15,
  tool: "create_open_loop",
};

export const buildFirstPlanPriority: AgentPriorityConfig = {
  name: "build_first_plan",
  description: "Turn the known profile into one useful checklist or plan that gives the student a reason to return.",
  fulfillmentCondition: "profile.first_plan_created",
  prompt: "let's turn this into one tiny plan you can actually use this week.",
  priority: 10,
  tool: "save_profile_fact",
};

export const collectTargetSchoolsPriority: AgentPriorityConfig = {
  name: "collect_target_schools",
  description: "Learn where the student is applying, considering, accepted, or trying to transfer.",
  fulfillmentCondition: "profile.target_schools_present",
  prompt: "what schools are on your mind right now?",
  priority: 15,
  tool: "create_open_loop",
};

export const checkNearestDeadlinePriority: AgentPriorityConfig = {
  name: "check_nearest_deadline",
  description: "Identify the nearest application, aid, housing, registration, or enrollment deadline.",
  fulfillmentCondition: "profile.next_deadline_checked",
  prompt: "let's make sure there isn't a deadline sneaking up first.",
  priority: 12,
  tool: "application_deadline_tracker",
};

export const collectCurrentInstitutionPriority: AgentPriorityConfig = {
  name: "collect_current_institution",
  description: "Learn where a current college or transfer student is enrolled now.",
  fulfillmentCondition: "profile.current_institution_present",
  prompt: "where are you taking classes right now?",
  priority: 15,
  tool: "create_open_loop",
};

export const checkCreditRiskPriority: AgentPriorityConfig = {
  name: "check_credit_risk",
  description: "Check whether credits or major requirements might slow down a transfer path.",
  fulfillmentCondition: "profile.transfer_credit_risk_checked",
  prompt: "before picking schools, let's make sure your credits won't get wasted.",
  priority: 12,
  tool: "credit_transfer_estimator",
};
