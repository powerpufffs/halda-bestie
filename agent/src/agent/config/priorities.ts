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
  description: "Learn one possible career, major, subject, or work environment the student wants to explore.",
  fulfillmentCondition: "profile.interests_or_target_majors_present",
  prompt: "what kind of work or subject sounds interesting to you right now?",
  priority: 15,
  tool: "create_open_loop",
};

export const buildFirstPlanPriority: AgentPriorityConfig = {
  name: "build_first_plan",
  description: "Turn the known profile into one useful checklist or plan that gives the student a reason to return.",
  fulfillmentCondition: "profile.first_plan_created",
  prompt: "let's turn this into one small plan you can actually use this week.",
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

export const collectCollegeSearchDirectionPriority: AgentPriorityConfig = {
  name: "collect_college_search_direction",
  description: "Learn what the college search should optimize around: major, career direction, campus feel, or known schools.",
  fulfillmentCondition: "profile.college_search_direction_present",
  prompt: "what should i search around - a major/career, campus feel, or schools you already have in mind?",
  priority: 45,
  tool: "create_open_loop",
  appliesToIntents: ["college_search"],
};

export const collectCollegeSearchRegionPriority: AgentPriorityConfig = {
  name: "collect_college_search_region",
  description: "Learn the state or area to search, or whether the student is open anywhere.",
  fulfillmentCondition: "profile.college_search_region_present",
  prompt: "what state or area should i search, or are you open anywhere?",
  priority: 42,
  tool: "create_open_loop",
  appliesToIntents: ["college_search"],
};

export const collectCollegeSearchBudgetPriority: AgentPriorityConfig = {
  name: "collect_college_search_budget",
  description: "Learn the student's rough annual budget after aid for college matching.",
  fulfillmentCondition: "profile.college_search_budget_present",
  prompt: "rough yearly budget after aid - under 10k, 10-15k, 15-20k, or 20k+?",
  priority: 39,
  tool: "create_open_loop",
  appliesToIntents: ["college_search"],
};

export const collectCollegeSearchGpaPriority: AgentPriorityConfig = {
  name: "collect_college_search_gpa",
  description: "Learn GPA only so the college search can label rough reach, target, and likely fits.",
  fulfillmentCondition: "profile.college_search_gpa_present",
  prompt: "want me to factor in your gpa for reach/target/likely? if yes, what is it?",
  priority: 36,
  tool: "create_open_loop",
  appliesToIntents: ["college_search"],
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
