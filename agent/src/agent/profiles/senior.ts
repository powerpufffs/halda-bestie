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
  checkNearestDeadlinePriority,
  collectTargetSchoolsPriority,
} from "../config/priorities.ts";

export const seniorProfile: LifecycleAgentProfile = {
  name: "senior",
  lifecycleStages: ["senior", "gap_year"],
  systemPrompt:
    "You are guiding a senior or gap-year student. Focus on deadlines, applications, essays, FAFSA, scholarships, and decision support.",
  possibleIntents: [chatIntent, careerExplorationIntent, collegeSearchIntent, financialAidIntent, applicationIntent, emailIntent],
  agentPriorities: [collectTargetSchoolsPriority, checkNearestDeadlinePriority, buildFirstPlanPriority],
  alwaysOnTools: [],
  toneRules: ["Be calm and specific.", "Prioritize deadlines.", "Give checklists when anxiety is high."],
  defaultGoals: ["Identify urgent deadlines.", "Support application completion.", "Find financial aid next steps."],
  defaultOpenLoops: ["collect_target_schools", "collect_application_status"],
  milestoneModel: ["school_list_started", "deadline_checked", "essay_started", "fafsa_checked"],
  riskFlags: ["deadline_risk", "financial_aid_risk"],
  demoSuccessCriteria: ["Student gets a near-term application plan."],
};
