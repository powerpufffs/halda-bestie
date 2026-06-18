import type { AgentOpenLoop, LifecycleStage, StudentProfileState } from "./types.ts";
import type { StudentIntent } from "./intent.ts";

interface ReplyInput {
  text: string;
  intent: StudentIntent;
  profile: StudentProfileState;
  openLoops: AgentOpenLoop[];
  selectedToolKeys: string[];
}

export function buildReply(input: ReplyInput): string {
  const answer = answerForIntent(input.intent, input.profile.lifecycleStage);
  const reanchor = buildReanchor(input.profile, input.openLoops);

  return [answer, reanchor].filter(Boolean).join("\n\n");
}

function answerForIntent(intent: StudentIntent, stage: LifecycleStage): string {
  if (stage === "junior") {
    return answerForJuniorIntent(intent);
  }

  if (intent === "financial_aid") {
    return [
      "Cost matters. We should estimate what each school will likely cost after aid.",
      "Pick one:",
      "1. Estimate one school's cost",
      "2. Learn what FAFSA does",
      "3. Compare aid between schools",
    ].join("\n");
  }

  if (intent === "scholarships") {
    return [
      "Scholarships are worth tracking early.",
      "Pick one:",
      "1. Find scholarships for one school",
      "2. Find scholarships near where I live",
      "3. Start a scholarship deadline tracker",
    ].join("\n");
  }

  if (intent === "campus_visit") {
    return [
      "A campus visit should have a plan, not just a tour.",
      "Pick one:",
      "1. Plan a visit for one school",
      "2. Make a visit checklist",
      "3. Track questions, schedule, and follow-up",
    ].join("\n");
  }

  if (intent === "transfer") {
    return "For transfer, the big thing is avoiding wasted credits. I would start by matching your current courses against the target major requirements, then checking deadlines for the school you want next.";
  }

  if (intent === "application") {
    return "Application stuff gets less scary when we turn it into a short checklist: deadline, program requirements, essay status, transcript, FAFSA, and scholarships.";
  }

  if (intent === "college_search") {
    return "We can compare schools, but I would anchor it on what you want to do first. A good match is usually career path + cost + location + support, not just the school name.";
  }

  if (intent === "career") {
    return "Totally fair question. I would start with the kind of work you want your days to feel like, then map that to majors and schools.";
  }

  if (stage === "unknown") {
    return "I can help with careers, majors, schools, scholarships, or application stuff. Tell me what you are trying to sort out and I will keep it simple.";
  }

  return `Got it. Since you are in the ${stage.replace("_", " ")} lane, I will keep the advice matched to where you are right now.`;
}

function answerForJuniorIntent(intent: StudentIntent): string {
  if (intent === "financial_aid") {
    return [
      "Cost matters. Use a financial aid estimate for each school.",
      "Pick one:",
      "1. Estimate one school's real cost",
      "2. See what FAFSA and grants could cover",
      "3. Compare two schools by remaining cost",
    ].join("\n");
  }

  if (intent === "scholarships") {
    return [
      "Start a scholarship tracker now.",
      "Pick one:",
      "1. Search school scholarships",
      "2. Search local scholarships",
      "3. Track deadlines, eligibility, amounts, and status",
    ].join("\n");
  }

  if (intent === "campus_visit") {
    return [
      "Plan campus visits before senior year gets busy.",
      "Pick one:",
      "1. Plan a visit for one school",
      "2. Make a visit checklist",
      "3. Track questions, schedule, and follow-up",
    ].join("\n");
  }

  if (intent === "application") {
    return "You are in 11th grade, so your job is preparation. Build a school list, track requirements, and know which deadlines will hit first in senior year.";
  }

  if (intent === "college_search") {
    return "Start with a realistic school list. Compare each school by major fit, cost, location, admissions difficulty, and support for finishing.";
  }

  if (intent === "career") {
    return "Pick a direction, then test it. Choose one or two career interests and compare the majors, classes, and jobs connected to each.";
  }

  return "You are in 11th grade. Focus on the next clear step: choose a direction, build a school list, check cost, and make a timeline for senior-year deadlines.";
}

function buildReanchor(profile: StudentProfileState, openLoops: AgentOpenLoop[]): string | undefined {
  const onboardingLoop = openLoops.find((loop) =>
    ["identify_person_context", "identify_grade_level", "collect_lifecycle_stage"].includes(loop.loopType),
  );

  if (onboardingLoop) {
    return onboardingLoop.prompt;
  }

  return undefined;
}
