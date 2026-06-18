import { z } from "zod";
import { defineTool } from "./types.ts";

export const lifecycleTools = [
  defineTool({
    key: "unknown_onboarding",
    description:
      "Quickly identify who the person is and what student lifecycle profile should handle the conversation next.",
    inputSchema: z.object({
      latestMessage: z.string().min(1),
      possibleName: z.string().optional(),
      roleGuess: z.enum(["student", "guardian", "counselor", "institution_staff", "unknown"]).default("unknown"),
      stageGuess: z
        .enum(["unknown", "sophomore", "junior", "senior", "transfer", "current_college", "gap_year"])
        .default("unknown"),
      interestSignals: z.array(z.string()).default([]),
      urgency: z.enum(["low", "medium", "high"]).default("low"),
    }),
    lifecycleStages: ["unknown"],
    async execute(input) {
      return {
        persona:
          "Friendly older-student energy: warm, concise, curious, never corporate, and allergic to form-prison onboarding.",
        goal:
          "Answer the immediate message, identify the person's role and lifecycle stage fast, then hand off to the right profile.",
        replyPolicy: [
          "Lead with a direct answer if the person asked a real question.",
          "Ask at most one lightweight identity/stage question.",
          "Save any interest signals for profile building.",
          "Avoid fake teen slang; sound like a helpful student friend.",
        ],
        missingSlots: input.stageGuess === "unknown" ? ["lifecycle_stage"] : [],
        suggestedStageOptions: ["10th", "11th", "12th", "transfer", "current_college"],
        roleGuess: input.roleGuess,
        stageGuess: input.stageGuess,
        interestSignals: input.interestSignals,
        urgency: input.urgency,
      };
    },
  }),
  defineTool({
    key: "career_interest_quiz",
    description: "Run a short, low-pressure career exploration quiz.",
    inputSchema: z.object({
      knownInterests: z.array(z.string()).default([]),
      confidenceLevel: z.enum(["low", "medium", "high", "unknown"]).default("unknown"),
    }),
    lifecycleStages: ["unknown", "sophomore"],
    async execute(input) {
      return {
        quizMode: "single_choice_interest_style",
        options: ["hands-on", "people-focused", "creative", "analytical", "outdoorsy", "flexible"],
        knownInterests: input.knownInterests,
        confidenceLevel: input.confidenceLevel,
      };
    },
  }),
  defineTool({
    key: "build_10th_grade_plan",
    description: "Create a sophomore-friendly exploration and course-planning checklist.",
    inputSchema: z.object({
      interestArea: z.string().optional(),
      currentCourses: z.array(z.string()).default([]),
    }),
    lifecycleStages: ["sophomore"],
    async execute(input) {
      return {
        checklist: [
          "Choose one class next semester that tests a possible interest.",
          "Talk to one adult who works near that interest.",
          "Save one nearby college/program that could fit.",
        ],
        interestArea: input.interestArea,
        currentCourses: input.currentCourses,
      };
    },
  }),
  defineTool({
    key: "build_junior_timeline",
    description: "Create a junior-year college readiness timeline.",
    inputSchema: z.object({
      targetTerm: z.string().default("next 90 days"),
      interests: z.array(z.string()).default([]),
      testingStatus: z.enum(["not_started", "planning", "scheduled", "completed", "unknown"]).default("unknown"),
    }),
    lifecycleStages: ["junior"],
    async execute(input) {
      return {
        targetTerm: input.targetTerm,
        timeline: [
          "This month: pick 2-3 career/major directions to compare.",
          "Next month: build a starter school list with cost and program fit.",
          "This semester: decide whether SAT/ACT testing belongs in the plan.",
        ],
        interests: input.interests,
        testingStatus: input.testingStatus,
      };
    },
  }),
  defineTool({
    key: "college_match_search",
    description: "Find schools that match a student's interests, constraints, and region.",
    inputSchema: z.object({
      interests: z.array(z.string()).default([]),
      region: z.string().optional(),
      constraints: z.array(z.string()).default([]),
      maxResults: z.number().int().min(1).max(10).default(5),
    }),
    lifecycleStages: ["junior", "senior", "transfer", "gap_year"],
    async execute(input) {
      return {
        status: "not_connected",
        query: {
          interests: input.interests,
          region: input.region,
          constraints: input.constraints,
          maxResults: input.maxResults,
        },
        nextStep: "Wire this tool to College Scorecard and program data before returning factual matches.",
      };
    },
  }),
  defineTool({
    key: "application_deadline_tracker",
    description: "Track senior-year application and aid deadlines.",
    inputSchema: z.object({
      schools: z.array(z.string()).default([]),
      applicationStatus: z.string().optional(),
    }),
    lifecycleStages: ["senior", "gap_year"],
    async execute(input) {
      return {
        schools: input.schools,
        applicationStatus: input.applicationStatus ?? "unknown",
        checklist: ["Confirm each school deadline.", "Check FAFSA/state aid timing.", "Pick the next application task."],
      };
    },
  }),
  defineTool({
    key: "essay_feedback",
    description: "Give concise admissions essay feedback.",
    inputSchema: z.object({
      essayText: z.string().min(1),
      prompt: z.string().optional(),
      feedbackMode: z.enum(["quick", "structure", "voice", "final_polish"]).default("quick"),
    }),
    lifecycleStages: ["senior", "transfer", "gap_year"],
    async execute(input) {
      return {
        feedbackMode: input.feedbackMode,
        note:
          "Essay review is scaffolded. Wire this to the LLM review pass before using it for detailed admissions feedback.",
        prompt: input.prompt,
        characterCount: input.essayText.length,
      };
    },
  }),
  defineTool({
    key: "fafsa_checklist",
    description: "Help the student understand FAFSA and financial aid next steps.",
    inputSchema: z.object({
      studentStatus: z.enum(["dependent", "independent", "unknown"]).default("unknown"),
      hasFsaId: z.boolean().optional(),
      parentInvolved: z.boolean().optional(),
    }),
    lifecycleStages: ["senior", "transfer", "current_college", "gap_year"],
    async execute(input) {
      return {
        checklist: [
          "Create or confirm FSA ID access.",
          "Gather student and parent financial info if needed.",
          "List schools that should receive FAFSA information.",
        ],
        studentStatus: input.studentStatus,
        hasFsaId: input.hasFsaId,
        parentInvolved: input.parentInvolved,
      };
    },
  }),
  defineTool({
    key: "credit_transfer_estimator",
    description: "Help transfer students think through credit transfer risk and next steps.",
    inputSchema: z.object({
      currentInstitution: z.string().optional(),
      targetInstitution: z.string().optional(),
      completedCredits: z.number().int().nonnegative().optional(),
      targetMajor: z.string().optional(),
    }),
    lifecycleStages: ["transfer", "current_college"],
    async execute(input) {
      return {
        riskLevel: "unknown",
        nextSteps: [
          "Find the target school's transfer equivalency page.",
          "Compare major prerequisites, not just general credits.",
          "Ask admissions/advising to confirm any unclear courses.",
        ],
        currentInstitution: input.currentInstitution,
        targetInstitution: input.targetInstitution,
        completedCredits: input.completedCredits,
        targetMajor: input.targetMajor,
      };
    },
  }),
  defineTool({
    key: "major_requirement_compare",
    description: "Compare major requirements across schools or pathways.",
    inputSchema: z.object({
      major: z.string().min(1),
      schools: z.array(z.string()).min(1),
    }),
    lifecycleStages: ["transfer", "current_college", "senior"],
    async execute(input) {
      return {
        status: "not_connected",
        major: input.major,
        schools: input.schools,
        nextStep: "Wire this tool to catalog/program requirement data before returning factual comparisons.",
      };
    },
  }),
];
