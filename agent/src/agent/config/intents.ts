import type { IntentConfig, ToolKey } from "./types.ts";
import type { TriageIntent } from "../triage.ts";

const workspaceStateTools = [
  "save_profile_fact",
  "update_communication_style",
  "create_open_loop",
  "complete_open_loop",
] as const satisfies readonly ToolKey[];

function actionIntent<Name extends Exclude<TriageIntent, "chat">>(
  intent: Omit<IntentConfig<Name>, "tools"> & { tools: readonly ToolKey[] },
): IntentConfig<Name> {
  return {
    ...intent,
    tools: [...workspaceStateTools, ...intent.tools],
  };
}

export const chatIntent: IntentConfig<"chat"> = {
  name: "chat",
  tools: ["update_communication_style"],
  triggerCondition: "default",
  description: "Default conversational bucket for greetings, jokes, acknowledgments, venting, and general conversation.",
  promptDirective:
    "Just talk naturally. Only use update_communication_style if the student explicitly asks Halda to change how she talks.",
};

export const careerExplorationIntent = actionIntent({
  name: "career",
  tools: ["career_interest_quiz"],
  triggerCondition: "career_or_major_signal",
  description: "Explore careers, majors, interests, and possible future paths.",
  promptDirective: "Lead career to major to school. Keep it low-pressure and concrete.",
});

export const collegeSearchIntent = actionIntent({
  name: "college_search",
  tools: ["lookup_college", "college_match_search"],
  triggerCondition: "college_or_program_search_signal",
  description: "Search or compare colleges, programs, locations, and fit.",
  promptDirective:
    "Use college_match_search for recommendation lists and lookup_college for one school. Collect missing search inputs naturally, and be clear when program fit is inferred rather than verified.",
});

export const emailIntent = actionIntent({
  name: "email",
  tools: ["search_user_email", "list_email_action_items"],
  triggerCondition: "email_or_inbox_signal",
  description: "Search saved inbox messages and extracted college email action items.",
  promptDirective: "Use saved inbox data. Be clear when no connected inbox or matching email exists.",
});

export const financialAidIntent = actionIntent({
  name: "financial_aid",
  tools: ["fafsa_checklist"],
  triggerCondition: "cost_or_scholarship_signal",
  description: "Handle scholarships, FAFSA, aid offers, price, tuition, and affordability.",
  promptDirective: "Separate sticker price from net cost and give one next financial-aid move.",
});

export const decisionIntent = actionIntent({
  name: "decision",
  tools: ["decision_aid_compare"],
  triggerCondition: "offer_decision_signal",
  description: "Compare offers, net cost, fit, deposits, and enrollment decisions.",
  promptDirective: "Help the student compare offers without pretending money is the only factor.",
});

export const essayIntent = actionIntent({
  name: "essay",
  tools: ["essay_feedback"],
  triggerCondition: "essay_or_personal_statement_signal",
  description: "Help with personal statements, supplementals, hooks, structure, voice, and final polish.",
  promptDirective: "Give essay help like an admissions reader: concrete, brief, and anchored to the student's draft when present.",
});

export const activitiesIntent = actionIntent({
  name: "activities",
  tools: ["activities_list_coach"],
  triggerCondition: "activities_or_resume_signal",
  description: "Improve Common App activities, extracurricular bullets, leadership framing, and impact language.",
  promptDirective: "Coach the student toward action verbs, quantified impact, and the 150-character Common App limit.",
});

export const interviewIntent = actionIntent({
  name: "interview",
  tools: ["interview_prep"],
  triggerCondition: "interview_signal",
  description: "Practice admissions interviews, school-specific questions, and answer feedback.",
  promptDirective: "Make interview prep feel like practice, not a lecture. Ask or answer one thing at a time.",
});

export const applicationIntent = actionIntent({
  name: "application",
  tools: ["application_deadline_tracker"],
  triggerCondition: "application_essay_or_deadline_signal",
  description: "Handle applications, essays, admissions tasks, and deadlines.",
  promptDirective: "Prioritize the nearest deadline or highest-friction application task.",
});

export const transferIntent = actionIntent({
  name: "transfer",
  tools: ["credit_transfer_estimator", "major_requirement_compare"],
  triggerCondition: "transfer_credit_or_current_college_signal",
  description: "Handle transfer credits, current college pathways, and major requirement risk.",
  promptDirective: "Respect their current college experience and flag wasted-credit risk early.",
});
