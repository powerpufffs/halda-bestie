import { z } from "zod";
import { defineTool } from "./types.ts";

const CAREERS: Record<string, { bucket: string; dayInLife: string; salaryRange: string; growthOutlook: string }> = {
  // Building / Engineering
  "software engineer": {
    bucket: "engineering",
    dayInLife: "writing code, debugging, building apps or systems — mostly at a desk but super collaborative",
    salaryRange: "$85K–$150K+ starting, one of the highest-paying degrees out there",
    growthOutlook: "exploding — AI is creating more jobs, not fewer",
  },
  "mechanical engineer": {
    bucket: "engineering",
    dayInLife: "designing machines, products, or systems — think cars, robots, medical devices",
    salaryRange: "$70K–$100K starting",
    growthOutlook: "steady — always needed in manufacturing, aerospace, energy",
  },
  "architect": {
    bucket: "engineering",
    dayInLife: "designing buildings — lots of drawing, client meetings, and software like AutoCAD",
    salaryRange: "$55K–$90K, higher in big cities",
    growthOutlook: "steady — requires a 5-year degree and licensure",
  },
  "electrician": {
    bucket: "engineering",
    dayInLife: "installing and maintaining electrical systems — mostly hands-on, on job sites",
    salaryRange: "$55K–$85K, often through trade school not a 4-year degree",
    growthOutlook: "strong — huge demand with EV and solar growth",
  },

  // Helping People
  "nurse": {
    bucket: "helping people",
    dayInLife: "working directly with patients — taking vitals, giving meds, coordinating care. hospitals, clinics, schools",
    salaryRange: "$60K–$90K starting, higher with specialization",
    growthOutlook: "one of the most in-demand jobs in the country right now",
  },
  "social worker": {
    bucket: "helping people",
    dayInLife: "helping individuals and families navigate tough situations — abuse, poverty, mental health, housing",
    salaryRange: "$45K–$65K, higher with a master's",
    growthOutlook: "growing — especially in schools and healthcare",
  },
  "therapist": {
    bucket: "helping people",
    dayInLife: "one-on-one sessions helping people work through mental health challenges — mostly office-based",
    salaryRange: "$55K–$90K, requires a master's degree",
    growthOutlook: "strong — mental health demand is at an all-time high",
  },
  "teacher": {
    bucket: "helping people",
    dayInLife: "lesson planning, teaching, grading, working with kids — summers off is real 😄",
    salaryRange: "$40K–$65K depending on state and level",
    growthOutlook: "steady — always needed, especially in STEM subjects",
  },
  "doctor": {
    bucket: "helping people",
    dayInLife: "diagnosing and treating patients — long road (4 years college + 4 med school + residency) but high reward",
    salaryRange: "$200K–$400K+ depending on specialty",
    growthOutlook: "very strong — aging population drives demand",
  },

  // Business
  "marketing manager": {
    bucket: "business",
    dayInLife: "running campaigns, managing social media, analyzing data, working with creative teams",
    salaryRange: "$55K–$100K+",
    growthOutlook: "strong — every company needs marketing",
  },
  "financial analyst": {
    bucket: "business",
    dayInLife: "analyzing data, building financial models, advising companies on investments and strategy",
    salaryRange: "$65K–$110K starting",
    growthOutlook: "steady — finance is always in demand",
  },
  "entrepreneur": {
    bucket: "business",
    dayInLife: "building your own thing — product, sales, hiring, everything. high risk, high reward",
    salaryRange: "zero to unlimited — most startups fail, but the ones that don't can be life-changing",
    growthOutlook: "always viable — the path is just harder and less predictable",
  },
  "accountant": {
    bucket: "business",
    dayInLife: "managing financial records, taxes, audits — more interesting than it sounds, especially in advisory roles",
    salaryRange: "$55K–$90K, CPAs earn more",
    growthOutlook: "stable — everyone needs accountants",
  },
  "hr manager": {
    bucket: "business",
    dayInLife: "hiring, managing benefits, resolving workplace issues, building company culture",
    salaryRange: "$55K–$90K",
    growthOutlook: "steady — growing in tech and healthcare sectors",
  },

  // Arts / Creative
  "graphic designer": {
    bucket: "art",
    dayInLife: "creating visual content for brands, apps, ads, packaging — mostly on a computer",
    salaryRange: "$45K–$80K, higher in tech or at agencies",
    growthOutlook: "competitive but steady — portfolio matters more than school",
  },
  "filmmaker": {
    bucket: "art",
    dayInLife: "writing, directing, shooting, editing — could be films, TV, YouTube, commercials",
    salaryRange: "$40K–$100K+ depending on the gig — very variable",
    growthOutlook: "competitive — content demand is exploding but so is the supply of creators",
  },
  "photographer": {
    bucket: "art",
    dayInLife: "shooting and editing photos — weddings, brands, journalism, real estate, anything",
    salaryRange: "$35K–$70K, most photographers freelance",
    growthOutlook: "competitive — building a client base is the hard part",
  },
  "musician": {
    bucket: "art",
    dayInLife: "performing, recording, teaching, composing — very few make it on music alone",
    salaryRange: "$30K–$100K+ — hugely variable, most supplement with teaching or gigs",
    growthOutlook: "hard path but real — most successful musicians have multiple income streams",
  },
  "ux designer": {
    bucket: "art",
    dayInLife: "designing how apps and websites feel to use — research, wireframes, testing with users",
    salaryRange: "$75K–$130K — one of the best-paid creative careers",
    growthOutlook: "strong — every tech company needs UX",
  },

  // Science / Tech
  "data scientist": {
    bucket: "science",
    dayInLife: "analyzing large datasets, building models, finding insights — lots of Python and statistics",
    salaryRange: "$90K–$140K starting",
    growthOutlook: "exploding — one of the fastest growing fields",
  },
  "biologist": {
    bucket: "science",
    dayInLife: "research, lab work, fieldwork — studying living organisms from cells to ecosystems",
    salaryRange: "$45K–$80K, higher with a PhD",
    growthOutlook: "steady — biotech and pharma are growing fast",
  },
  "chemist": {
    bucket: "science",
    dayInLife: "lab research, developing materials, pharmaceuticals, food science — very hands-on",
    salaryRange: "$55K–$90K",
    growthOutlook: "steady — especially in pharma and materials science",
  },
  "environmental scientist": {
    bucket: "science",
    dayInLife: "fieldwork, data collection, policy work — studying climate, ecosystems, pollution",
    salaryRange: "$50K–$80K",
    growthOutlook: "growing — climate demand is real",
  },
  "physician assistant": {
    bucket: "science",
    dayInLife: "examining patients, diagnosing, prescribing — similar to a doctor with less schooling",
    salaryRange: "$115K–$145K — great return on investment",
    growthOutlook: "very strong — one of the best healthcare careers for the investment",
  },
};

export const careerExplorerTool = defineTool({
  key: "explore_career",
  description: "Look up what a specific career actually looks like day-to-day and what it pays. Use when a student asks about a career or wants to explore what a direction leads to.",
  inputSchema: z.object({
    career: z.string().describe("The career to look up, e.g. 'software engineer', 'nurse', 'graphic designer'"),
  }),
  lifecycleStages: ["sophomore", "junior", "senior", "transfer"],
  async execute(input) {
    const key = input.career.toLowerCase().trim();

    // exact match
    if (CAREERS[key]) return { found: true, career: key, ...CAREERS[key] };

    // fuzzy match — also strip common suffixes (nursing→nurse, engineering→engineer)
    const stem = key.replace(/(ing|tion|ment|ist|er|or|ry|y)$/, "");
    const match = Object.keys(CAREERS).find(
      (k) => k.includes(key) || key.includes(k) || k.includes(stem) || key.split(" ").some((w) => k.includes(w)),
    );

    if (match) return { found: true, career: match, ...CAREERS[match] };

    // bucket fallback
    const bucketMap: Record<string, string[]> = {
      engineering: ["software engineer", "mechanical engineer", "architect", "electrician"],
      "helping people": ["nurse", "social worker", "therapist", "teacher", "doctor"],
      business: ["marketing manager", "financial analyst", "entrepreneur", "accountant", "hr manager"],
      art: ["graphic designer", "filmmaker", "photographer", "musician", "ux designer"],
      science: ["data scientist", "biologist", "chemist", "environmental scientist", "physician assistant"],
    };

    for (const [bucket, careers] of Object.entries(bucketMap)) {
      if (key.includes(bucket) || bucket.includes(key)) {
        return {
          found: false,
          message: `i don't have exact data on "${input.career}" but here are careers in that direction`,
          suggestions: careers,
          bucket,
        };
      }
    }

    return {
      found: false,
      message: `i don't have data on "${input.career}" yet — try being more specific`,
      suggestions: Object.keys(CAREERS).slice(0, 5),
    };
  },
});
