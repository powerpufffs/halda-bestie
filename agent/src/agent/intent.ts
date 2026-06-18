export type StudentIntent =
  | "application"
  | "career"
  | "college_search"
  | "financial_aid"
  | "transfer"
  | "unknown";

const intentPatterns: Array<{ intent: StudentIntent; patterns: RegExp[] }> = [
  { intent: "transfer", patterns: [/\btransfer\b/i, /\bcredits?\b/i, /\bcommunity college\b/i] },
  { intent: "financial_aid", patterns: [/\bscholarship/i, /\bfafsa\b/i, /\bfinancial aid\b/i, /\bcost\b/i] },
  { intent: "application", patterns: [/\bapply\b/i, /\bapplication\b/i, /\bessay\b/i, /\bdeadline\b/i] },
  {
    intent: "career",
    patterns: [
      /\bcareer\b/i,
      /\bmajor\b/i,
      /\bjob\b/i,
      /\bwant to do\b/i,
      /\bnursing\b/i,
      /\bhealthcare\b/i,
      /\bcomputer science\b/i,
      /\bcoding\b/i,
      /\bbusiness\b/i,
    ],
  },
  { intent: "college_search", patterns: [/\bschool\b/i, /\bcollege\b/i, /\buniversity\b/i, /\buvu\b/i] },
];

export function classifyIntent(text: string): StudentIntent {
  return intentPatterns.find((candidate) => candidate.patterns.some((pattern) => pattern.test(text)))?.intent ?? "unknown";
}
