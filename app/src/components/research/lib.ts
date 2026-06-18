import type { School, StudentProfile } from "./types";

export const usd = (n: number) =>
  n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

export const pct = (n: number) => `${Math.round(n * 100)}%`;

/** Convert a 1600 SAT to the approximate ACT-equivalent percentile midpoint. */
export function satMidpoint(range: [number, number]) {
  return Math.round((range[0] + range[1]) / 2);
}

/**
 * Estimate the net price a family pays at a school by interpolating the
 * school's published net-price-by-income bands around the family's income.
 */
export function estimateNetPrice(
  school: School,
  householdIncome: number,
): number {
  const b = school.netPriceByIncome;
  const points: [number, number][] = [
    [15_000, b.band0_30k],
    [39_000, b.band30_48k],
    [61_500, b.band48_75k],
    [92_500, b.band75_110k],
    [140_000, b.band110kPlus],
  ];

  if (householdIncome <= points[0][0]) return points[0][1];
  if (householdIncome >= points[points.length - 1][0])
    return points[points.length - 1][1];

  for (let i = 0; i < points.length - 1; i++) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[i + 1];
    if (householdIncome >= x0 && householdIncome <= x1) {
      const t = (householdIncome - x0) / (x1 - x0);
      return Math.round(y0 + t * (y1 - y0));
    }
  }
  return b.band48_75k;
}

export interface FitBreakdown {
  /** How well the student's SAT lands in the admitted middle-50. */
  academic: number;
  /** How well estimated net price fits the family budget. */
  affordability: number;
  /** Strength of the student's intended program. */
  program: number;
  /** Campus-setting preference match. */
  setting: number;
  /** Weighted overall 0–100. */
  overall: number;
  /** Rough admissions posture given the student's stats. */
  reach: "likely" | "target" | "reach" | "far-reach";
}

const WEIGHTS = {
  academic: 0.2,
  affordability: 0.35,
  program: 0.3,
  setting: 0.15,
};

function clamp(n: number, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, n));
}

export function computeFit(
  school: School,
  profile: StudentProfile,
): FitBreakdown {
  const mid = satMidpoint(school.satRange);
  // Academic: peak when at/above the midpoint, falling off below the 25th pct.
  const academic = clamp(50 + ((profile.sat - mid) / (mid - school.satRange[0] || 1)) * 50);

  // Affordability: 100 when net price is at/under budget, decaying as it exceeds.
  const net = estimateNetPrice(school, profile.householdIncome);
  const over = net - profile.budget;
  const affordability =
    over <= 0 ? 100 : clamp(100 - (over / profile.budget) * 120);

  const program = clamp(school.program.offered ? school.program.strength : 0);

  const setting = profile.settingPreferences.includes(school.setting)
    ? 100
    : 55;

  const overall = Math.round(
    academic * WEIGHTS.academic +
      affordability * WEIGHTS.affordability +
      program * WEIGHTS.program +
      setting * WEIGHTS.setting,
  );

  // Admissions posture from admit rate + how the student's SAT lands.
  let reach: FitBreakdown["reach"];
  const stretch = profile.sat - mid;
  if (school.admitRate > 0.6) reach = stretch > -80 ? "likely" : "target";
  else if (school.admitRate > 0.3)
    reach = stretch > 0 ? "target" : stretch > -120 ? "target" : "reach";
  else if (school.admitRate > 0.15) reach = stretch > 60 ? "reach" : "reach";
  else reach = "far-reach";

  return {
    academic: Math.round(academic),
    affordability: Math.round(affordability),
    program: Math.round(program),
    setting,
    overall,
    reach,
  };
}

/** Days until an ISO date from a reference date (defaults to today's seed). */
export function daysUntil(iso: string, today = "2026-06-18"): number {
  const a = new Date(iso + "T00:00:00");
  const b = new Date(today + "T00:00:00");
  return Math.round((a.getTime() - b.getTime()) / 86_400_000);
}

export function formatDeadline(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
