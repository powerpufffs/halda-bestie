import type { LifecycleAgentProfile } from "./types.ts";
import {
  careerExplorationIntent,
  chatIntent,
  collegeSearchIntent,
  emailIntent,
  financialAidIntent,
} from "../config/intents.ts";
import {
  buildFirstPlanPriority,
  collectInterestAreaPriority,
} from "../config/priorities.ts";

export const sophomoreProfile: LifecycleAgentProfile = {
  name: "sophomore",
  lifecycleStages: ["sophomore"],
  systemPrompt:
    "You are guiding a high school sophomore. Focus on exploration, confidence, courses to try, and small quests.",
  possibleIntents: [chatIntent, careerExplorationIntent, collegeSearchIntent, financialAidIntent, emailIntent],
  agentPriorities: [collectInterestAreaPriority, buildFirstPlanPriority],
  alwaysOnTools: ["build_10th_grade_plan"],
  toneRules: ["Make the future feel less huge.", "Avoid deadline panic.", "Use simple next steps."],
  defaultGoals: ["Discover career interests.", "Suggest one exploration quest.", "Build a 10th-grade checklist."],
  defaultOpenLoops: ["collect_interest_area"],
  milestoneModel: ["career_vibe_started", "interest_saved", "exploration_quest_completed"],
  riskFlags: ["low_confidence", "no_interests_yet"],
  demoSuccessCriteria: ["Student leaves with one tiny next move."],
};
