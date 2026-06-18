import { z } from "zod";
import https from "node:https";
import { JSDOM } from "jsdom";
import { defineTool } from "./types.ts";

const API_KEY = process.env.COLLEGE_SCORECARD_API_KEY ?? "xBYPoQoWf7ZeTrba4sAur5ZDntcHngw8dpHBXbR4";

// ─── DIRECTION MAP ────────────────────────────────────────────────────────────
const DIRECTION_MAP: Record<string, string[]> = {
  writing:          ["0904", "2305", "0901"],
  journalism:       ["0904", "0901"],
  english:          ["2305", "0904", "0901"],
  communications:   ["0901", "0904"],
  business:         ["5202", "5214", "5208", "5203"],
  marketing:        ["5214", "5202"],
  finance:          ["5208", "5202"],
  accounting:       ["5203", "5202"],
  entrepreneurship: ["5202", "5214"],
  healthcare:       ["5138", "2601", "5120", "5100"],
  nursing:          ["5138"],
  "pre-med":        ["2601", "5138"],
  medicine:         ["2601", "5138"],
  pharmacy:         ["5120"],
  tech:             ["1107", "1409"],
  technology:       ["1107", "1409"],
  "computer science": ["1107"],
  cs:               ["1107"],
  coding:           ["1107", "1409"],
  software:         ["1409", "1107"],
  data:             ["1107"],
  engineering:      ["1401", "1409", "1407"],
  "helping people": ["4407", "4201", "5100"],
  "social work":    ["4407"],
  psychology:       ["4201", "4407"],
  "mental health":  ["4201", "4407"],
  education:        ["1301"],
  teaching:         ["1301"],
  art:              ["5007", "5004", "5006"],
  design:           ["5004", "5007"],
  "graphic design": ["5004"],
  film:             ["5006", "5007"],
  creative:         ["5004", "5007", "5006", "5009"],
  music:            ["5009"],
  science:          ["2601", "0301", "4005", "2701"],
  biology:          ["2601"],
  environment:      ["0301", "2601"],
  environmental:    ["0301"],
  chemistry:        ["4005", "2601"],
  math:             ["2701", "1107"],
  law:              ["4301", "4510"],
  "criminal justice": ["4301"],
  politics:         ["4510", "4506"],
  "political science": ["4510"],
  economics:        ["4506", "5208"],
  architecture:     ["0402"],
  "physical therapy": ["5123"],
  sports:           ["3101", "5202"],
  kinesiology:      ["3101"],
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function apiGet(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
      });
    }).on("error", reject);
  });
}

function httpsGetHtml(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return httpsGetHtml(res.headers.location!).then(resolve).catch(reject);
      }
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve(data));
    });
    req.on("error", reject);
  });
}

async function fetchAcceptedGPA(schoolName: string): Promise<number | null> {
  try {
    const slug = schoolName.replace(/[^a-zA-Z0-9 ]/g, "").trim().replace(/\s+/g, "-");
    const url = `https://www.prepscholar.com/sat/s/colleges/${slug}-admission-requirements`;
    const html = await httpsGetHtml(url);
    const dom = new JSDOM(html);
    const text = dom.window.document.body.textContent ?? "";
    const match = text.match(/average\s+GPA[^0-9]*([0-9]\.[0-9]{1,2})/i)
                || text.match(/GPA[^0-9]*([0-9]\.[0-9]{1,2})/i);
    return match?.[1] ? parseFloat(match[1]) : null;
  } catch {
    return null;
  }
}

function getAcceptanceLikelihood(studentGPA: number, acceptedGPA: number | null, acceptanceRate: number | null): string {
  if (!acceptanceRate && !acceptedGPA) return "Open Admission";

  let pct = acceptanceRate ? acceptanceRate * 100 : 50;

  if (acceptedGPA) {
    const diff = studentGPA - acceptedGPA;
    if (diff >= 0.3)       pct += 15;
    else if (diff >= 0)    pct += 7;
    else if (diff >= -0.3) pct -= 10;
    else if (diff >= -0.6) pct -= 20;
    else                   pct -= 35;
  }

  pct = Math.round(Math.min(95, Math.max(5, pct)));
  return `${pct}%`;
}

function getMajorEarnings(school: any, cip: string | null): number | null {
  const programs = school["latest.programs.cip_4_digit"];
  if (!programs || !cip) return null;
  const match = programs.find((p: any) => String(p.code) === String(cip) && p.credential?.level === 3);
  return match?.earnings?.["4_yr"]?.overall_median_earnings
      || match?.earnings?.["5_yr"]?.overall_median_earnings
      || null;
}

function formatSchool(s: any, student: CollegeSearchInput, cip: string | null) {
  const isPublic = s["school.ownership"] === 1;
  const netPrice = isPublic ? s["latest.cost.avg_net_price.public"] : s["latest.cost.avg_net_price.private"];
  const overallEarnings = s["latest.earnings.10_yrs_after_entry.median"];
  const majorEarnings = getMajorEarnings(s, cip);
  const earnings = majorEarnings || overallEarnings;
  const gradRate = s["latest.completion.rate_suppressed.overall"] || 0;
  const acceptance = s["latest.admissions.admission_rate.overall"];
  const pellRate = s["latest.aid.pell_grant_rate"];

  let budgetFlag = "";
  let budgetScore = 1;
  if (netPrice && student.budget) {
    const pct = (netPrice - student.budget) / student.budget;
    if (pct <= 0)        { budgetFlag = "under budget";      budgetScore = 1.3; }
    else if (pct <= 0.2) { budgetFlag = "slightly over";     budgetScore = 1.0; }
    else if (pct <= 0.4) { budgetFlag = "over — check aid";  budgetScore = 0.7; }
    else                 { budgetFlag = "significantly over"; budgetScore = 0.3; }
  }

  const firstGenBoost = student.firstGen && pellRate > 0.3 ? 0.1 : 0;
  const score =
    ((earnings || 0) / 100000) * 0.4 +
    (1 - Math.min((netPrice || 50000) / 50000, 1)) * 0.3 +
    gradRate * 0.2 +
    budgetScore * 0.1 +
    firstGenBoost;

  return {
    name: s["school.name"] as string,
    city: s["school.city"] as string,
    state: s["school.state"] as string,
    url: s["school.school_url"] as string,
    netPrice: netPrice ? `$${netPrice.toLocaleString()}/yr` : "N/A",
    netPriceRaw: netPrice as number | null,
    acceptanceRate: acceptance ? `${Math.round(acceptance * 100)}%` : "N/A",
    acceptanceRateRaw: acceptance as number | null,
    graduationRate: gradRate ? `${Math.round(gradRate * 100)}%` : "N/A",
    majorEarnings: majorEarnings ? `$${majorEarnings.toLocaleString()}` : null,
    overallEarnings: overallEarnings ? `$${overallEarnings.toLocaleString()}` : "N/A",
    medianDebt: s["latest.aid.median_debt.completers.overall"]
      ? `$${s["latest.aid.median_debt.completers.overall"].toLocaleString()}` : "N/A",
    pellGrantRate: pellRate ? `${Math.round(pellRate * 100)}%` : "N/A",
    budgetFlag,
    score,
    acceptedGPA: null as string | null,
    likelihood: null as string | null,
  };
}

async function fetchSchoolsByCip(student: CollegeSearchInput, cip: string | null) {
  const fields = [
    "id", "school.name", "school.city", "school.state", "school.ownership",
    "school.school_url",
    "latest.admissions.admission_rate.overall",
    "latest.cost.tuition.in_state",
    "latest.cost.avg_net_price.public",
    "latest.cost.avg_net_price.private",
    "latest.completion.rate_suppressed.overall",
    "latest.earnings.10_yrs_after_entry.median",
    "latest.aid.median_debt.completers.overall",
    "latest.aid.pell_grant_rate",
    "latest.student.demographics.first_generation",
    "latest.programs.cip_4_digit",
  ].join(",");

  const params = new URLSearchParams({
    api_key: API_KEY,
    fields,
    per_page: "20",
    "school.operating": "1",
    "school.degrees_awarded.predominant__range": student.isTransfer ? "2..4" : "3..4",
  });

  if (student.state) params.append("school.state", student.state);
  if (cip) params.append("latest.programs.cip_4_digit.code", cip);

  const url = `https://api.data.gov/ed/collegescorecard/v1/schools?${params.toString()}`;
  const json = await apiGet(url);
  return (json.results ?? []) as any[];
}

// ─── INPUT SCHEMA ─────────────────────────────────────────────────────────────
const inputSchema = z.object({
  careerIntent: z.string().describe("Student's general interest direction, e.g. 'business', 'healthcare', 'writing'"),
  state: z.string().length(2).optional().describe("2-letter US state code"),
  budget: z.number().positive().describe("Annual budget in dollars after aid"),
  gpa: z.number().min(0).max(5).optional().describe("Student's GPA"),
  firstGen: z.boolean().default(false),
  isTransfer: z.boolean().default(false),
});

type CollegeSearchInput = z.infer<typeof inputSchema>;

// ─── TOOL DEFINITION ──────────────────────────────────────────────────────────
export const collegeSearchTool = defineTool({
  key: "college_match_search",
  description:
    "Search for best-fit colleges using the student's career interest, state, budget, and GPA. Returns top matches with earnings, net price, and acceptance likelihood.",
  inputSchema,
  lifecycleStages: ["sophomore", "junior", "senior", "transfer"],
  async execute(input) {
    const direction = input.careerIntent.toLowerCase();
    const cips = DIRECTION_MAP[direction] ?? [];

    let rawResults: any[];
    if (cips.length > 0) {
      const allResults = await Promise.all(cips.map((cip) => fetchSchoolsByCip(input, cip)));
      const seen = new Set<string>();
      rawResults = allResults.flat().filter((s) => {
        if (seen.has(s.id)) return false;
        seen.add(s.id);
        return true;
      });
    } else {
      rawResults = await fetchSchoolsByCip(input, null);
    }

    const primaryCip = cips[0] ?? null;

    let results = rawResults
      .filter((s) => s["latest.earnings.10_yrs_after_entry.median"] != null)
      .map((s) => formatSchool(s, input, primaryCip))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    if (results.length === 0 && cips.length > 0) {
      rawResults = await fetchSchoolsByCip(input, null);
      results = rawResults
        .filter((s) => s["latest.earnings.10_yrs_after_entry.median"] != null)
        .map((s) => formatSchool(s, input, null))
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
    }

    if (input.gpa) {
      await Promise.all(
        results.map(async (school) => {
          const acceptedGPA = await fetchAcceptedGPA(school.name);
          school.acceptedGPA = acceptedGPA ? acceptedGPA.toFixed(2) : null;
          school.likelihood = getAcceptanceLikelihood(
            input.gpa!,
            acceptedGPA,
            school.acceptanceRateRaw,
          );
        }),
      );
    }

    return { results };
  },
});
