import { extractUsStatePreference } from "../data/us-states.ts";
import type { AgentOpenLoop, JsonObject, StudentProfileState } from "./types.ts";
import type { TurnTriage } from "./triage.ts";

export function updateCollegeSearchFacts(
  profile: StudentProfileState,
  text: string,
  triage: TurnTriage,
  openLoops: AgentOpenLoop[],
): JsonObject | undefined {
  const existing = asRecord(profile.facts.collegeSearch);
  const activeCollegeSearchLoop = openLoops.find((loop) => loop.loopType.startsWith("collect_college_search_"));
  const isCollegeSearchTurn = triage.intent === "college_search" || Boolean(activeCollegeSearchLoop);
  if (!isCollegeSearchTurn && Object.keys(existing).length === 0) return undefined;

  const next: JsonObject = { ...existing };
  let changed = false;
  const setValue = (key: string, value: unknown) => {
    if (value === undefined || next[key] === value) return;
    next[key] = value;
    changed = true;
  };

  const currentInterests = asStringArray(next.interests);
  const mergedInterests = [...new Set([...currentInterests, ...triage.interests])];
  if (mergedInterests.length > currentInterests.length) {
    next.interests = mergedInterests;
    changed = true;
  }
  if (!readString(next.direction) && triage.interests[0]) setValue("direction", triage.interests[0]);

  const region = extractUsStatePreference(text);
  if (region.code) {
    setValue("region", region.code);
    setValue("openAnywhere", false);
  } else if (region.openAnywhere) {
    if (next.region !== undefined) {
      delete next.region;
      changed = true;
    }
    setValue("openAnywhere", true);
  }

  setValue("budgetAnnual", extractBudgetAnnual(text));
  setValue("gpa", extractGpa(text, activeCollegeSearchLoop?.loopType === "collect_college_search_gpa"));
  const firstGen = extractFirstGen(text);
  if (firstGen !== undefined) setValue("firstGen", firstGen);
  if (activeCollegeSearchLoop?.loopType === "collect_college_search_gpa" && /\b(skip|pass|not now|no thanks)\b/i.test(text)) {
    setValue("gpaSkipped", true);
  }

  const knownSchools = extractKnownSchools(text, triage.acceptedSchool);
  if (knownSchools.length > 0) {
    next.knownSchools = [...new Set([...asStringArray(next.knownSchools), ...knownSchools])];
    changed = true;
  }

  if (
    activeCollegeSearchLoop?.loopType === "collect_college_search_direction" &&
    !readString(next.direction) &&
    triage.interests.length === 0 &&
    !region.code &&
    !region.openAnywhere &&
    extractBudgetAnnual(text) === undefined &&
    extractGpa(text, false) === undefined
  ) {
    const direction = shortFreeTextSlot(text);
    if (direction) setValue("direction", direction);
  }

  if (isCollegeSearchTurn) setValue("lastActiveAt", new Date().toISOString());

  return changed || Object.keys(next).length > 0 ? next : undefined;
}

function extractBudgetAnnual(text: string): number | undefined {
  const range = text.match(/\$?\s*(\d+(?:\.\d+)?)\s*(?:k|thousand)?\s*(?:-|to)\s*\$?\s*(\d+(?:\.\d+)?)\s*(k|thousand)?\b/i);
  if (range?.[1] && range[2]) {
    return Math.round((moneyAmount(range[1], true) + moneyAmount(range[2], Boolean(range[3]))) / 2);
  }

  const under = text.match(/\b(?:under|below|less than|up to|max)\s*\$?\s*(\d+(?:\.\d+)?)\s*(k|thousand)?\b/i);
  if (under?.[1]) return moneyAmount(under[1], Boolean(under[2]) || Number(under[1]) < 1000);

  const plus = text.match(/\$?\s*(\d+(?:\.\d+)?)\s*(k|thousand)\s*\+/i);
  if (plus?.[1]) return moneyAmount(plus[1], true);

  const explicit = text.match(/\$?\s*(\d{2,3}(?:,\d{3})+|\d{4,6})\b/);
  if (explicit?.[1]) return Number(explicit[1].replace(/,/g, ""));

  return undefined;
}

function moneyAmount(value: string, thousands: boolean): number {
  const parsed = Number(value);
  return Math.round(parsed * (thousands || parsed < 1000 ? 1000 : 1));
}

function extractGpa(text: string, allowBareNumber: boolean): number | undefined {
  const explicit =
    text.match(/\bgpa\s*(?:is|=|:)?\s*([0-5](?:\.\d{1,2})?)\b/i) ??
    text.match(/\b([0-5](?:\.\d{1,2})?)\s*(?:gpa|weighted|unweighted)\b/i);
  const bare = allowBareNumber ? text.match(/^\s*([0-5](?:\.\d{1,2})?)\s*$/) : undefined;
  const value = explicit?.[1] ?? bare?.[1];
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 5 ? parsed : undefined;
}

function extractFirstGen(text: string): boolean | undefined {
  if (/\b(not|no)\b.{0,20}\b(first[- ]?gen|first generation)\b/i.test(text)) return false;
  if (/\b(first[- ]?gen|first generation)\b/i.test(text)) return true;
  return undefined;
}

function extractKnownSchools(text: string, acceptedSchool: string | undefined): string[] {
  const schools = new Set<string>();
  if (acceptedSchool) schools.add(acceptedSchool);

  const schoolList =
    text.match(/\b(?:schools?|colleges?)\s+(?:are|is|in mind|i like|i'm thinking|im thinking|:)\s+(.+)$/i)?.[1] ??
    text.match(/\b(?:compare|look at|check)\s+(.+?)\s+(?:and|vs|versus)\s+(.+)$/i)?.slice(1).join(", ");
  if (!schoolList) return [...schools];

  for (const rawPart of schoolList.split(/\s*(?:,| and | vs | versus )\s*/i)) {
    const school = rawPart.replace(/[.!?]+$/g, "").trim().split(/\s+/).slice(0, 6).join(" ");
    if (school && !/\b(colleges?|schools?|universit(?:y|ies)|idk|anywhere)\b/i.test(school)) {
      schools.add(formatLooseName(school));
    }
  }

  return [...schools];
}

function shortFreeTextSlot(text: string): string | undefined {
  const cleaned = text.trim().replace(/[.!?]+$/g, "").replace(/\s+/g, " ");
  if (!cleaned || cleaned.length > 80 || cleaned.split(" ").length > 8) return undefined;
  if (/^(idk|i don't know|dont know|not sure|yes|no|ok|bet|cool)$/i.test(cleaned)) return undefined;
  return cleaned.toLowerCase();
}

function formatLooseName(value: string): string {
  if (/[A-Z]{2,}/.test(value)) return value;
  return value
    .split(" ")
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function asRecord(value: unknown): JsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as JsonObject;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}
