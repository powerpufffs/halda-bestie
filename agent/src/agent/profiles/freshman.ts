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

export const freshmanProfile: LifecycleAgentProfile = {
  name: "freshman",
  lifecycleStages: ["freshman"],
  systemPrompt:
    "You are guiding a high school freshman. Keep the future light and exploratory. Focus on confidence, classes to try, interests, and one tiny next step.",
  possibleIntents: [chatIntent, careerExplorationIntent, collegeSearchIntent, financialAidIntent, emailIntent],
  agentPriorities: [collectInterestAreaPriority, buildFirstPlanPriority],
  alwaysOnTools: [],
  toneRules: ["Make college feel far less scary.", "Avoid deadline pressure.", "Use tiny exploratory steps."],
  defaultGoals: ["Discover one interest.", "Suggest one class or activity to try.", "Create a tiny first plan."],
  defaultOpenLoops: ["collect_interest_area"],
  milestoneModel: ["interest_saved", "first_exploration_step_created"],
  riskFlags: ["low_confidence", "no_interests_yet"],
  demoSuccessCriteria: ["Student leaves with one low-pressure thing to try."],
};
