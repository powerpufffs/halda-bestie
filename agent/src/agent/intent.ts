export type StudentIntent =
  | "application"
  | "campus_visit"
  | "career"
  | "college_search"
  | "financial_aid"
  | "scholarships"
  | "transfer"
  | "unknown";

const intentPatterns: Array<{ intent: StudentIntent; patterns: RegExp[] }> = [
  { intent: "transfer", patterns: [/\btransfer\b/i, /\bcredits?\b/i, /\bcommunity college\b/i] },
  {
    intent: "scholarships",
    patterns: [
      /\bscholarships?\b/i,
      /\bscholorships?\b/i,
      /\bschollarships?\b/i,
      /\bschoolarships?\b/i,
      /\bmerit aid\b/i,
      /\bmerit scholarships?\b/i,
      /\bfree money for college\b/i,
    ],
  },
  {
    intent: "financial_aid",
    patterns: [
      /\bfafsa\b/i,
      /\bfasfa\b/i,
      /\bfinancial aid\b/i,
      /\bfinancial aide\b/i,
      /\bfinacial aid\b/i,
      /\bfinancal aid\b/i,
      /\bfinances?\b/i,
      /\bfinancials?\b/i,
      /\bcost\b/i,
      /\bprice\b/i,
      /\bbudget\b/i,
      /\blow cost\b/i,
      /\bmoney\b/i,
      /\btuition\b/i,
      /\bgrants?\b/i,
      /\bstudent loans?\b/i,
      /\bwork[- ]study\b/i,
      /\bpay(?:ing)? for college\b/i,
      /\bafford college\b/i,
      /\bhelp paying\b/i,
      /\bcollege is expensive\b/i,
    ],
  },
  {
    intent: "campus_visit",
    patterns: [
      /\bcampus visits?\b/i,
      /\bcamm?pus visits?\b/i,
      /\bcampus tours?\b/i,
      /\bcamm?pus tours?\b/i,
      /\bcollege visits?\b/i,
      /\bcollege tours?\b/i,
      /\bschool visits?\b/i,
      /\bschool tours?\b/i,
      /\buniversity visits?\b/i,
      /\buniversity tours?\b/i,
      /\bvisit campus\b/i,
      /\bvisit a campus\b/i,
      /\bvisit the campus\b/i,
      /\bvisit colleges?\b/i,
      /\bvisit schools?\b/i,
      /\bvisit universities?\b/i,
      /\btour campus\b/i,
      /\btour a campus\b/i,
      /\btour colleges?\b/i,
      /\btour schools?\b/i,
      /\bopen house\b/i,
      /\badmitted student days?\b/i,
      /\bpreview days?\b/i,
      /\bcampus day\b/i,
      /\bcampus event\b/i,
      /\binfo sessions?\b/i,
      /\binformation sessions?\b/i,
      /\bmeet admissions\b/i,
      /\btalk to admissions\b/i,
      /\bmeet with admissions\b/i,
      /\bmeet an advisor\b/i,
      /\btalk to an advisor\b/i,
      /\bdepartment visits?\b/i,
      /\bprogram visits?\b/i,
      /\bclass visits?\b/i,
      /\bsit in on a class\b/i,
      /\bdorm tours?\b/i,
      /\bhousing tours?\b/i,
      /\bsee the dorms\b/i,
      /\bsee housing\b/i,
      /\bwhere should I visit\b/i,
      /\bplan a visit\b/i,
      /\bplan my visit\b/i,
      /\bschedule a visit\b/i,
      /\bschedule my visit\b/i,
      /\bbook a visit\b/i,
      /\bbook a tour\b/i,
    ],
  },
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
