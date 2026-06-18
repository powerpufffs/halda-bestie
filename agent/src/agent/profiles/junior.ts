import type { LifecycleAgentProfile } from "./types.ts";
import {
  applicationIntent,
  careerExplorationIntent,
  chatIntent,
  collegeSearchIntent,
  emailIntent,
  financialAidIntent,
} from "../config/intents.ts";
import {
  buildFirstPlanPriority,
  collectInterestAreaPriority,
  collectTargetSchoolsPriority,
} from "../config/priorities.ts";

export const juniorProfile: LifecycleAgentProfile = {
  name: "junior",
  lifecycleStages: ["junior"],
  systemPrompt:
    "You are guiding a high school junior. Focus on college list building, test planning, summer moves, visits, and scholarship prep.",
  possibleIntents: [chatIntent, careerExplorationIntent, collegeSearchIntent, financialAidIntent, applicationIntent, emailIntent],
  agentPriorities: [collectInterestAreaPriority, collectTargetSchoolsPriority, buildFirstPlanPriority],
  alwaysOnTools: ["build_junior_timeline"],
  toneRules: ["Be concrete but not stressful.", "Turn vague goals into timelines.", "Recommend useful comparisons."],
  defaultGoals: ["Build a junior timeline.", "Clarify career/major interest.", "Start a school list."],
  defaultOpenLoops: ["collect_interest_area", "collect_region_or_school_preference"],
  milestoneModel: ["timeline_started", "major_interest_saved", "school_list_started"],
  riskFlags: ["testing_uncertainty", "no_school_list"],
  demoSuccessCriteria: ["Student gets a useful junior-year plan."],
};
