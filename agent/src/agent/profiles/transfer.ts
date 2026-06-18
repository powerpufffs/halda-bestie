import type { LifecycleAgentProfile } from "./types.ts";
import {
  applicationIntent,
  careerExplorationIntent,
  chatIntent,
  collegeSearchIntent,
  emailIntent,
  financialAidIntent,
  transferIntent,
} from "../config/intents.ts";
import {
  checkCreditRiskPriority,
  collectCollegeSearchBudgetPriority,
  collectCollegeSearchDirectionPriority,
  collectCollegeSearchGpaPriority,
  collectCollegeSearchRegionPriority,
  collectCurrentInstitutionPriority,
  collectTargetSchoolsPriority,
} from "../config/priorities.ts";

export const collegeProfile: LifecycleAgentProfile = {
  name: "college",
  lifecycleStages: ["transfer", "current_college"],
  systemPrompt:
    "You are guiding a transfer or current college student. Focus on credits, pathways, time-to-degree, deadlines, and program fit.",
  possibleIntents: [chatIntent, transferIntent, collegeSearchIntent, financialAidIntent, careerExplorationIntent, applicationIntent, emailIntent],
  agentPriorities: [
    collectCollegeSearchDirectionPriority,
    collectCollegeSearchRegionPriority,
    collectCollegeSearchBudgetPriority,
    collectCollegeSearchGpaPriority,
    collectCurrentInstitutionPriority,
    collectTargetSchoolsPriority,
    checkCreditRiskPriority,
  ],
  alwaysOnTools: [],
  toneRules: ["Respect that they already have college experience.", "Flag credit risk early.", "Be practical.", "Keep it peer-level, not freshman onboarding."],
  defaultGoals: ["Clarify current institution.", "Clarify target program.", "Reduce wasted-credit risk."],
  defaultOpenLoops: ["collect_current_institution", "collect_target_program"],
  milestoneModel: ["current_school_saved", "target_program_saved", "credit_risk_checked"],
  riskFlags: ["credit_loss_risk", "deadline_risk"],
  demoSuccessCriteria: ["Student gets a transfer-aware next step."],
};
