import { z } from "zod";
import { defineTool } from "./types.ts";

const SENIOR_TOOLKIT_BASE = "/senior";
const ACTIVITY_MAX_CHARS = 150;

const ACTION_VERBS = [
  "Led",
  "Founded",
  "Built",
  "Organized",
  "Launched",
  "Coordinated",
  "Designed",
  "Directed",
  "Mentored",
  "Raised",
  "Created",
  "Managed",
];

export const seniorApplicationTools = [
  defineTool({
    key: "application_deadline_tracker",
    description: "Create a senior application deadline board and next-step checklist.",
    inputSchema: z.object({
      schools: z.array(z.string()).default([]),
      deadlines: z
        .array(
          z.object({
            school: z.string().min(1),
            round: z.enum(["ED", "ED II", "EA", "REA", "RD", "Rolling"]).optional(),
            date: z.string().optional(),
            status: z
              .enum(["not_started", "in_progress", "submitted", "decision_received", "unknown"])
              .default("unknown"),
          }),
        )
        .default([]),
      applicationStatus: z.string().optional(),
    }),
    lifecycleStages: ["unknown", "junior", "senior", "gap_year"],
    async execute(input) {
      const schools = mergeSchoolNames(input.schools, input.deadlines.map((deadline) => deadline.school));
      const nearest = findNearestDeadline(input.deadlines);

      return {
        toolkitUrl: seniorToolkitUrl("deadlines"),
        schools: input.schools,
        applicationStatus: input.applicationStatus ?? "unknown",
        boardColumns: ["not_started", "in_progress", "submitted", "decision_received"],
        nearestDeadline: nearest,
        checklist: buildDeadlineChecklist(schools, Boolean(nearest)),
      };
    },
  }),
  defineTool({
    key: "essay_feedback",
    description: "Give concise admissions essay feedback or open the essay lab.",
    inputSchema: z.object({
      essayText: z.string().default(""),
      prompt: z.string().optional(),
      feedbackMode: z.enum(["quick", "structure", "voice", "final_polish"]).default("quick"),
    }),
    lifecycleStages: ["unknown", "junior", "senior", "transfer", "current_college", "gap_year"],
    async execute(input) {
      const essayText = input.essayText.trim();
      if (!essayText) {
        return {
          toolkitUrl: seniorToolkitUrl("essay"),
          feedbackMode: input.feedbackMode,
          needsDraft: true,
          starterMoves: [
            "Pick one specific scene instead of a broad life summary.",
            "Write the messy version first, then tighten the hook.",
            "Use the essay lab for score, inline suggestions, and counselor prompts.",
          ],
        };
      }

      const score = scoreEssayDraft(essayText, input.prompt);

      return {
        toolkitUrl: seniorToolkitUrl("essay"),
        feedbackMode: input.feedbackMode,
        prompt: input.prompt,
        characterCount: essayText.length,
        wordCount: countWords(essayText),
        score,
        scoreSummary: summarizeEssayScore(score),
        suggestions: essaySuggestions(essayText),
        advice: essayAdvice(essayText, input.prompt),
      };
    },
  }),
  defineTool({
    key: "activities_list_coach",
    description: "Improve a Common App activity entry with impact language and 150-character guidance.",
    inputSchema: z.object({
      description: z.string().default(""),
      activityType: z.string().optional(),
      position: z.string().optional(),
      organization: z.string().optional(),
    }),
    lifecycleStages: ["junior", "senior", "gap_year"],
    async execute(input) {
      const description = input.description.trim();
      const feedback = coachActivity(description);

      return {
        toolkitUrl: seniorToolkitUrl("activities"),
        maxCharacters: ACTIVITY_MAX_CHARS,
        characterCount: description.length,
        charactersRemaining: ACTIVITY_MAX_CHARS - description.length,
        activityType: input.activityType,
        position: input.position,
        organization: input.organization,
        feedback: feedback.feedback,
        rewrite: feedback.rewrite,
      };
    },
  }),
  defineTool({
    key: "interview_prep",
    description: "Prepare for admissions interviews with school-specific questions or answer feedback.",
    inputSchema: z.object({
      school: z.string().default("the school"),
      mode: z.enum(["questions", "answer_feedback", "mock_start"]).default("questions"),
      question: z.string().optional(),
      answer: z.string().optional(),
    }),
    lifecycleStages: ["senior", "gap_year"],
    async execute(input) {
      const school = input.school.trim() || "the school";

      return {
        toolkitUrl: seniorToolkitUrl("interview"),
        school,
        mode: input.mode,
        questions: interviewQuestionsForSchool(school),
        feedback:
          input.mode === "answer_feedback"
            ? interviewAnswerFeedback(input.answer ?? "", input.question)
            : undefined,
        opener:
          input.mode === "mock_start"
            ? `start with: tell me a little about yourself, and why ${school}?`
            : undefined,
      };
    },
  }),
  defineTool({
    key: "decision_aid_compare",
    description: "Compare college offers by net price, aid, fit, and decision risk.",
    inputSchema: z.object({
      offers: z
        .array(
          z.object({
            school: z.string().min(1),
            status: z.enum(["pending", "accepted", "waitlisted", "denied", "unknown"]).default("unknown"),
            cost: z.number().nonnegative().optional(),
            aid: z.number().nonnegative().optional(),
            fitScore: z.number().min(1).max(10).optional(),
            notes: z.string().optional(),
          }),
        )
        .default([]),
    }),
    lifecycleStages: ["senior", "gap_year"],
    async execute(input) {
      const compared = compareOffers(input.offers);

      return {
        toolkitUrl: seniorToolkitUrl("decisions"),
        offers: compared.offers,
        bestFinancialValue: compared.bestFinancialValue,
        strongestFit: compared.strongestFit,
        checklist: [
          "Confirm net price using grants and scholarships, not loans alone.",
          "Check deposit and housing deadlines before waiting too long.",
          "Name one non-money fit factor that actually matters to you.",
        ],
      };
    },
  }),
];

function seniorToolkitUrl(tool: "essay" | "activities" | "interview" | "deadlines" | "decisions"): string {
  return `${SENIOR_TOOLKIT_BASE}?tool=${tool}`;
}

function mergeSchoolNames(...groups: string[][]): string[] {
  return [...new Set(groups.flat().map((school) => school.trim()).filter(Boolean))];
}

function findNearestDeadline(
  deadlines: Array<{ school: string; round?: string; date?: string; status?: string }>,
) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  return deadlines
    .map((deadline) => {
      const date = deadline.date ? new Date(`${deadline.date}T00:00:00`) : null;
      const daysUntil =
        date && Number.isFinite(date.getTime())
          ? Math.round((date.getTime() - startOfToday) / 86_400_000)
          : null;

      return {
        school: deadline.school,
        round: deadline.round ?? "unknown",
        date: deadline.date,
        status: deadline.status ?? "unknown",
        daysUntil,
      };
    })
    .filter((deadline) => deadline.daysUntil === null || deadline.daysUntil >= 0)
    .toSorted((a, b) => (a.daysUntil ?? Number.POSITIVE_INFINITY) - (b.daysUntil ?? Number.POSITIVE_INFINITY))[0];
}

function buildDeadlineChecklist(schools: string[], hasNearestDeadline: boolean): string[] {
  const checklist = [
    hasNearestDeadline ? "Do the closest deadline first." : "Confirm the exact deadline for each school.",
    "Mark each school as not started, in progress, submitted, or decision received.",
    "Check whether FAFSA, CSS Profile, housing, or scholarship deadlines are separate.",
  ];

  if (schools.length === 0) {
    checklist.unshift("Add the schools you are applying to so the deadline board is not floating in your head.");
  }

  return checklist;
}

function countWords(value: string): number {
  return value.trim() ? value.trim().split(/\s+/).length : 0;
}

function scoreEssayDraft(text: string, prompt?: string): number {
  const words = countWords(text);
  const hasScene = /\b(when|after|before|during|walked|sat|heard|saw|felt|remember)\b/i.test(text);
  const hasReflection = /\b(learned|realized|understood|changed|because|now i|taught me)\b/i.test(text);
  const hasSpecifics = /\d|"|named|called|mrs\.|mr\.|dr\./i.test(text);
  const hasCliche = /\b(passionate|hardworking|ever since i was young|changed my life|from a young age)\b/i.test(text);
  const answersPrompt = !prompt || text.toLowerCase().includes(prompt.toLowerCase().split(/\s+/)[0] ?? "");

  let score = 58;
  if (words >= 250) score += 9;
  else if (words < 120) score -= 10;
  if (hasScene) score += 9;
  if (hasReflection) score += 9;
  if (hasSpecifics) score += 7;
  if (!answersPrompt) score -= 5;
  if (hasCliche) score -= 10;

  return Math.min(94, Math.max(35, score));
}

function summarizeEssayScore(score: number): string {
  if (score >= 82) return "strong draft, now make the voice and reflection sharper.";
  if (score >= 65) return "solid start, but it needs more specific scenes and reflection.";
  return "early draft energy, useful raw material but not admissions-ready yet.";
}

function essaySuggestions(text: string) {
  const suggestions: Array<{ type: "grammar" | "structure" | "tone"; original?: string; suggestion: string; explanation: string }> = [];
  const grammarRules: Array<{ re: RegExp; fix: string; explanation: string }> = [
    { re: /\bI done\b/i, fix: "I did", explanation: "small grammar slips can pull a reader out of the story." },
    { re: /\bbuilded\b/i, fix: "built", explanation: "clean mechanics help the reader trust the rest of the application." },
    { re: /\balot\b/i, fix: "a lot", explanation: "simple polish matters in a final application draft." },
  ];

  for (const rule of grammarRules) {
    const match = text.match(rule.re);
    if (!match) continue;
    suggestions.push({ type: "grammar", original: match[0], suggestion: rule.fix, explanation: rule.explanation });
  }

  if (countWords(text) < 250) {
    suggestions.push({
      type: "structure",
      suggestion: "add one concrete scene before you summarize what it means.",
      explanation: "admissions readers remember moments more than claims.",
    });
  }

  if (/\b(passionate|hardworking|changed my life)\b/i.test(text)) {
    suggestions.push({
      type: "tone",
      suggestion: "replace the broad phrase with a specific action or image.",
      explanation: "specificity makes the essay sound less generic.",
    });
  }

  return suggestions.slice(0, 5);
}

function essayAdvice(text: string, prompt?: string) {
  const advice = [
    { category: "hook", point: "open closer to the moment where something actually happens.", question: "what is the first scene a reader should see?" },
    { category: "specificity", point: "trade broad traits for details that only you could write.", question: "what object, place, person, or sentence makes this story yours?" },
    { category: "reflection", point: "make the final third show what changed in how you think or act.", question: "what do you understand now that you did not understand then?" },
  ];

  if (prompt) {
    advice.unshift({
      category: "prompt_fit",
      point: "make sure the draft answers the actual prompt before polishing style.",
      question: "which sentence most directly answers what the prompt is asking?",
    });
  }

  if (countWords(text) > 650) {
    advice.push({
      category: "structure",
      point: "this may be running long, cut any sentence that repeats the same lesson.",
      question: "which paragraph would the essay still survive without?",
    });
  }

  return advice.slice(0, 5);
}

function coachActivity(description: string): { feedback: string; rewrite?: string } {
  if (!description) {
    return { feedback: "paste one activity bullet and i can tighten it around action, impact, and the 150-character limit." };
  }

  const tips: string[] = [];
  if (description.length > ACTIVITY_MAX_CHARS) tips.push(`trim to ${ACTIVITY_MAX_CHARS} characters, it is currently ${description.length}.`);

  const startsWithVerb = ACTION_VERBS.some((verb) => description.toLowerCase().startsWith(verb.toLowerCase()));
  if (!startsWithVerb) tips.push("start with a strong action verb.");
  if (!/\d/.test(description)) tips.push("quantify the impact if you can.");
  if (!/\b(led|built|founded|raised|managed|organized|mentored|created)\b/i.test(description)) {
    tips.push("make your role obvious, not just the club name.");
  }
  if (tips.length === 0) tips.push("solid entry, now push the result or impact one level clearer.");

  const cleaned = description.replace(/^(i\s+|we\s+|member of\s+)/i, "").trim();
  const verb = startsWithVerb ? "" : `${ACTION_VERBS[description.length % ACTION_VERBS.length]} `;

  return { feedback: tips.join(" "), rewrite: `${verb}${cleaned}`.slice(0, ACTIVITY_MAX_CHARS) };
}

function interviewQuestionsForSchool(school: string) {
  return [
    { question: "tell me about yourself.", lookingFor: "a clear throughline with one real story, not a resume recap." },
    { question: `why ${school}?`, lookingFor: "specific fit beyond rankings, prestige, or location." },
    { question: `what would you contribute to the ${school} community?`, lookingFor: "a concrete sense of how they would show up on campus." },
    { question: "what do you want to study, and why?", lookingFor: "curiosity and direction, even if the major is not final." },
    { question: "tell me about a challenge and what changed after it.", lookingFor: "reflection, maturity, and a believable growth arc." },
  ];
}

function interviewAnswerFeedback(answer: string, question?: string): string {
  const words = countWords(answer);
  const parts: string[] = [];

  if (!answer.trim()) return "answer the question out loud once, then paste the rough version here.";
  if (words < 40) parts.push("good start, but add a short story so it is not just a one-liner.");
  else if (words > 220) parts.push("strong detail, but tighten it to a focused 60-90 second answer.");
  else parts.push("solid length, it has enough room to feel human.");

  parts.push(
    question
      ? `for "${question}", answer directly in the first sentence.`
      : "lead with the direct answer in the first sentence.",
  );
  parts.push("end by connecting the story to what you would bring to campus.");

  return parts.join(" ");
}

function compareOffers(
  offers: Array<{ school: string; status?: string; cost?: number; aid?: number; fitScore?: number; notes?: string }>,
) {
  const normalized = offers.map((offer) => {
    const cost = offer.cost ?? 0;
    const aid = offer.aid ?? 0;

    return {
      ...offer,
      cost,
      aid,
      netPrice: Math.max(0, cost - aid),
      missingMoneyData: cost === 0 && aid === 0,
      fitScore: offer.fitScore ?? null,
    };
  });

  const priced = normalized.filter((offer) => !offer.missingMoneyData);
  const fitScored = normalized.filter((offer) => typeof offer.fitScore === "number");

  return {
    offers: normalized.toSorted((a, b) => a.netPrice - b.netPrice),
    bestFinancialValue: priced.length
      ? priced.reduce((best, offer) => (offer.netPrice < best.netPrice ? offer : best))
      : null,
    strongestFit: fitScored.length
      ? fitScored.reduce((best, offer) => ((offer.fitScore ?? 0) > (best.fitScore ?? 0) ? offer : best))
      : null,
  };
}
