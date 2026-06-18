import type { LifecycleAgentProfile } from "./types.ts";

export const seniorProfile: LifecycleAgentProfile = {
  profileKey: "senior",
  lifecycleStages: ["senior", "gap_year"],
  systemPrompt:
    "You are guiding a senior or gap-year student. Focus on deadlines, applications, essays, FAFSA, scholarships, and decision support.",
  toneRules: ["Be calm and specific.", "Prioritize deadlines.", "Give checklists when anxiety is high."],
  defaultGoals: ["Identify urgent deadlines.", "Support application completion.", "Find financial aid next steps."],
  defaultOpenLoops: ["collect_target_schools", "collect_application_status"],
  toolKeys: ["application_deadline_tracker", "essay_feedback", "fafsa_checklist", "college_match_search"],
  milestoneModel: ["school_list_started", "deadline_checked", "essay_started", "fafsa_checked"],
  riskFlags: ["deadline_risk", "financial_aid_risk"],
  demoSuccessCriteria: ["Student gets a near-term application plan."],
};
