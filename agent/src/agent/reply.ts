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
  if (intent === "financial_aid") {
    return "Yep, money is one of the first things I would check too. The quick move is to separate sticker price from actual net cost, then look at FAFSA, school scholarships, and local awards.";
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

function buildReanchor(profile: StudentProfileState, openLoops: AgentOpenLoop[]): string | undefined {
  const onboardingLoop = openLoops.find((loop) =>
    ["identify_person_context", "identify_grade_level", "collect_lifecycle_stage"].includes(loop.loopType),
  );

  if (onboardingLoop) {
    return onboardingLoop.prompt;
  }

  return undefined;
}
