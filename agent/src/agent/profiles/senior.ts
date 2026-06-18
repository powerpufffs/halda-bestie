import type { LifecycleAgentProfile } from "./types.ts";
import {
  activitiesIntent,
  applicationIntent,
  careerExplorationIntent,
  chatIntent,
  collegeSearchIntent,
  decisionIntent,
  emailIntent,
  essayIntent,
  financialAidIntent,
  interviewIntent,
} from "../config/intents.ts";
import {
  buildFirstPlanPriority,
  checkNearestDeadlinePriority,
  collectCollegeSearchBudgetPriority,
  collectCollegeSearchDirectionPriority,
  collectCollegeSearchGpaPriority,
  collectCollegeSearchRegionPriority,
  collectTargetSchoolsPriority,
} from "../config/priorities.ts";

export const seniorProfile: LifecycleAgentProfile = {
  name: "senior",
  lifecycleStages: ["senior", "gap_year"],
  systemPrompt:
    "You are guiding a senior or gap-year student. Focus on deadlines, applications, essays, FAFSA, scholarships, and decision support.",
  possibleIntents: [
    chatIntent,
    careerExplorationIntent,
    collegeSearchIntent,
    financialAidIntent,
    decisionIntent,
    applicationIntent,
    essayIntent,
    activitiesIntent,
    interviewIntent,
    emailIntent,
  ],
  agentPriorities: [
    collectCollegeSearchDirectionPriority,
    collectCollegeSearchRegionPriority,
    collectCollegeSearchBudgetPriority,
    collectCollegeSearchGpaPriority,
    collectTargetSchoolsPriority,
    checkNearestDeadlinePriority,
    buildFirstPlanPriority,
  ],
  alwaysOnTools: [],
  toneRules: ["Be calm and specific.", "Prioritize deadlines.", "Give checklists when anxiety is high.", "Sound steady and practical, not like an alarm bell."],
  defaultGoals: ["Identify urgent deadlines.", "Support application completion.", "Find financial aid next steps."],
  defaultOpenLoops: ["collect_target_schools", "collect_application_status"],
  milestoneModel: ["school_list_started", "deadline_checked", "essay_started", "interview_practiced", "offer_compared", "fafsa_checked"],
  riskFlags: ["deadline_risk", "financial_aid_risk"],
  demoSuccessCriteria: ["Student gets a near-term application plan."],
};
