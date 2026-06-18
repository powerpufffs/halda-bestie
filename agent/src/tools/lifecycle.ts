import type { ToolDefinition } from "./types.ts";

export const lifecycleTools = [
  {
    key: "career_interest_quiz",
    description: "Run a short, low-pressure career exploration quiz.",
    lifecycleStages: ["unknown", "sophomore"],
  },
  {
    key: "build_10th_grade_plan",
    description: "Create a sophomore-friendly exploration and course-planning checklist.",
    lifecycleStages: ["sophomore"],
  },
  {
    key: "build_junior_timeline",
    description: "Create a junior-year college readiness timeline.",
    lifecycleStages: ["junior"],
  },
  {
    key: "college_match_search",
    description: "Find schools that match a student's interests, constraints, and region.",
    lifecycleStages: ["junior", "senior", "transfer", "gap_year"],
  },
  {
    key: "application_deadline_tracker",
    description: "Track senior-year application and aid deadlines.",
    lifecycleStages: ["senior", "gap_year"],
  },
  {
    key: "essay_feedback",
    description: "Give concise admissions essay feedback.",
    lifecycleStages: ["senior", "transfer", "gap_year"],
  },
  {
    key: "fafsa_checklist",
    description: "Help the student understand FAFSA and financial aid next steps.",
    lifecycleStages: ["senior", "transfer", "current_college", "gap_year"],
  },
  {
    key: "credit_transfer_estimator",
    description: "Help transfer students think through credit transfer risk and next steps.",
    lifecycleStages: ["transfer", "current_college"],
  },
  {
    key: "major_requirement_compare",
    description: "Compare major requirements across schools or pathways.",
    lifecycleStages: ["transfer", "current_college", "senior"],
  },
] satisfies ToolDefinition[];
