import type { StudentProfile } from "../research/types";
import { schools } from "../research/data";

// The shared school catalog is the same data the rest of the app uses — Explore
// just surfaces it through sophomore-appropriate tools. Re-exported so the
// Explore components don't reach across into the research module directly.
export { schools };

/**
 * Seeded sophomore profile. In production this comes from the student's Profile
 * Passport — the same passport the junior/senior tools read. Here it's a 10th
 * grader so the Explore experience reflects the sophomore talk track.
 */
export const profile: StudentProfile = {
  name: "Maya Rivera",
  grade: "sophomore",
  homeState: "TX",
  gpa: 3.6,
  sat: 1180,
  intendedMajor: "Undecided",
  careerInterest: "Still figuring it out",
  budget: 17_000,
  householdIncome: 55_000,
  householdSize: 4,
  firstGen: true,
  settingPreferences: ["urban", "suburban"],
  priorities: [
    "Figure out what I'm into",
    "Somewhere I can afford",
    "Good support for first-gen students",
  ],
};

/** Interest direction. Keys mirror the buckets the agent's career tools use. */
export type BucketKey =
  | "engineering"
  | "helping people"
  | "business"
  | "art"
  | "science";

export interface Bucket {
  key: BucketKey;
  emoji: string;
  label: string;
  blurb: string;
}

// The 1–5 interest menu Halda texts a sophomore. Same order as the profile.
export const BUCKETS: Bucket[] = [
  { key: "engineering", emoji: "🛠️", label: "Building & engineering", blurb: "building or making things" },
  { key: "helping people", emoji: "🤝", label: "Helping people", blurb: "helping or working with people" },
  { key: "business", emoji: "💼", label: "Business & leadership", blurb: "business, money, or leadership" },
  { key: "art", emoji: "🎨", label: "Arts & creative", blurb: "arts, music, or creative stuff" },
  { key: "science", emoji: "🔬", label: "Science & tech", blurb: "science, tech, or figuring out how things work" },
];

export interface Career {
  name: string;
  emoji: string;
  bucket: BucketKey;
  /** What the job actually looks like day to day. */
  dayInLife: string;
  /** Plain-English pay range. NOT starting salary unless noted. */
  salaryRange: string;
  /** Where the field is headed. */
  growthOutlook: string;
}

// Mirrors the CAREERS map in agent/src/tools/career-explorer.ts — the source of
// truth for what each career pays. Keep the two in sync when either changes.
export const CAREERS: Career[] = [
  // Building / Engineering
  { name: "Software Engineer", emoji: "💻", bucket: "engineering", dayInLife: "writing code, debugging, building apps or systems — mostly at a desk but super collaborative", salaryRange: "$85K–$150K+ starting, one of the highest-paying degrees out there", growthOutlook: "exploding — AI is creating more jobs, not fewer" },
  { name: "Mechanical Engineer", emoji: "⚙️", bucket: "engineering", dayInLife: "designing machines, products, or systems — think cars, robots, medical devices", salaryRange: "$70K–$100K starting", growthOutlook: "steady — always needed in manufacturing, aerospace, energy" },
  { name: "Architect", emoji: "📐", bucket: "engineering", dayInLife: "designing buildings — lots of drawing, client meetings, and software like AutoCAD", salaryRange: "$55K–$90K, higher in big cities", growthOutlook: "steady — requires a 5-year degree and licensure" },
  { name: "Electrician", emoji: "🔌", bucket: "engineering", dayInLife: "installing and maintaining electrical systems — mostly hands-on, on job sites", salaryRange: "$55K–$85K, often through trade school not a 4-year degree", growthOutlook: "strong — huge demand with EV and solar growth" },

  // Helping People
  { name: "Nurse", emoji: "🩺", bucket: "helping people", dayInLife: "working directly with patients — taking vitals, giving meds, coordinating care. hospitals, clinics, schools", salaryRange: "$60K–$90K starting, higher with specialization", growthOutlook: "one of the most in-demand jobs in the country right now" },
  { name: "Social Worker", emoji: "🫂", bucket: "helping people", dayInLife: "helping individuals and families navigate tough situations — mental health, housing, support", salaryRange: "$45K–$65K, higher with a master's", growthOutlook: "growing — especially in schools and healthcare" },
  { name: "Therapist", emoji: "🛋️", bucket: "helping people", dayInLife: "one-on-one sessions helping people work through mental health challenges — mostly office-based", salaryRange: "$55K–$90K, requires a master's degree", growthOutlook: "strong — mental health demand is at an all-time high" },
  { name: "Teacher", emoji: "🍎", bucket: "helping people", dayInLife: "lesson planning, teaching, grading, working with kids — summers off is real 😄", salaryRange: "$40K–$65K depending on state and level", growthOutlook: "steady — always needed, especially in STEM subjects" },
  { name: "Doctor", emoji: "👩‍⚕️", bucket: "helping people", dayInLife: "diagnosing and treating patients — long road (4 yrs college + 4 med school + residency) but high reward", salaryRange: "$200K–$400K+ depending on specialty", growthOutlook: "very strong — aging population drives demand" },

  // Business
  { name: "Marketing Manager", emoji: "📣", bucket: "business", dayInLife: "running campaigns, managing social media, analyzing data, working with creative teams", salaryRange: "$55K–$100K+", growthOutlook: "strong — every company needs marketing" },
  { name: "Financial Analyst", emoji: "📊", bucket: "business", dayInLife: "analyzing data, building financial models, advising companies on investments and strategy", salaryRange: "$65K–$110K starting", growthOutlook: "steady — finance is always in demand" },
  { name: "Entrepreneur", emoji: "🚀", bucket: "business", dayInLife: "building your own thing — product, sales, hiring, everything. high risk, high reward", salaryRange: "zero to unlimited — most startups fail, but the ones that don't can be life-changing", growthOutlook: "always viable — the path is just harder and less predictable" },
  { name: "Accountant", emoji: "🧮", bucket: "business", dayInLife: "managing financial records, taxes, audits — more interesting than it sounds, especially in advisory roles", salaryRange: "$55K–$90K, CPAs earn more", growthOutlook: "stable — everyone needs accountants" },
  { name: "HR Manager", emoji: "👥", bucket: "business", dayInLife: "hiring, managing benefits, resolving workplace issues, building company culture", salaryRange: "$55K–$90K", growthOutlook: "steady — growing in tech and healthcare sectors" },

  // Arts / Creative
  { name: "Graphic Designer", emoji: "🎨", bucket: "art", dayInLife: "creating visual content for brands, apps, ads, packaging — mostly on a computer", salaryRange: "$45K–$80K, higher in tech or at agencies", growthOutlook: "competitive but steady — portfolio matters more than school" },
  { name: "Filmmaker", emoji: "🎬", bucket: "art", dayInLife: "writing, directing, shooting, editing — could be films, TV, YouTube, commercials", salaryRange: "$40K–$100K+ depending on the gig — very variable", growthOutlook: "competitive — content demand is exploding but so is the supply of creators" },
  { name: "Photographer", emoji: "📷", bucket: "art", dayInLife: "shooting and editing photos — weddings, brands, journalism, real estate, anything", salaryRange: "$35K–$70K, most photographers freelance", growthOutlook: "competitive — building a client base is the hard part" },
  { name: "Musician", emoji: "🎸", bucket: "art", dayInLife: "performing, recording, teaching, composing — very few make it on music alone", salaryRange: "$30K–$100K+ — hugely variable, most supplement with teaching or gigs", growthOutlook: "hard path but real — most successful musicians have multiple income streams" },
  { name: "UX Designer", emoji: "🖌️", bucket: "art", dayInLife: "designing how apps and websites feel to use — research, wireframes, testing with users", salaryRange: "$75K–$130K — one of the best-paid creative careers", growthOutlook: "strong — every tech company needs UX" },

  // Science / Tech
  { name: "Data Scientist", emoji: "📈", bucket: "science", dayInLife: "analyzing large datasets, building models, finding insights — lots of Python and statistics", salaryRange: "$90K–$140K starting", growthOutlook: "exploding — one of the fastest growing fields" },
  { name: "Biologist", emoji: "🧬", bucket: "science", dayInLife: "research, lab work, fieldwork — studying living organisms from cells to ecosystems", salaryRange: "$45K–$80K, higher with a PhD", growthOutlook: "steady — biotech and pharma are growing fast" },
  { name: "Chemist", emoji: "🧪", bucket: "science", dayInLife: "lab research, developing materials, pharmaceuticals, food science — very hands-on", salaryRange: "$55K–$90K", growthOutlook: "steady — especially in pharma and materials science" },
  { name: "Environmental Scientist", emoji: "🌎", bucket: "science", dayInLife: "fieldwork, data collection, policy work — studying climate, ecosystems, pollution", salaryRange: "$50K–$80K", growthOutlook: "growing — climate demand is real" },
  { name: "Physician Assistant", emoji: "🩹", bucket: "science", dayInLife: "examining patients, diagnosing, prescribing — similar to a doctor with less schooling", salaryRange: "$115K–$145K — great return on investment", growthOutlook: "very strong — one of the best healthcare careers for the investment" },
];

/** Roadmap items — the sophomore checklist Halda keeps for the student. */
export const ROADMAP = [
  { id: "interests", emoji: "1️⃣", label: "Figure out what you're into" },
  { id: "schools", emoji: "2️⃣", label: "Find schools that match you" },
  { id: "careers", emoji: "3️⃣", label: "Explore what careers actually pay" },
  { id: "assessment", emoji: "4️⃣", label: "Take the career assessment" },
  { id: "checkin", emoji: "5️⃣", label: "Come back next month" },
] as const;

export type RoadmapId = (typeof ROADMAP)[number]["id"];
