export const US_STATES: Record<string, string> = {
  AL: "alabama",
  AK: "alaska",
  AZ: "arizona",
  AR: "arkansas",
  CA: "california",
  CO: "colorado",
  CT: "connecticut",
  DE: "delaware",
  FL: "florida",
  GA: "georgia",
  HI: "hawaii",
  ID: "idaho",
  IL: "illinois",
  IN: "indiana",
  IA: "iowa",
  KS: "kansas",
  KY: "kentucky",
  LA: "louisiana",
  ME: "maine",
  MD: "maryland",
  MA: "massachusetts",
  MI: "michigan",
  MN: "minnesota",
  MS: "mississippi",
  MO: "missouri",
  MT: "montana",
  NE: "nebraska",
  NV: "nevada",
  NH: "new hampshire",
  NJ: "new jersey",
  NM: "new mexico",
  NY: "new york",
  NC: "north carolina",
  ND: "north dakota",
  OH: "ohio",
  OK: "oklahoma",
  OR: "oregon",
  PA: "pennsylvania",
  RI: "rhode island",
  SC: "south carolina",
  SD: "south dakota",
  TN: "tennessee",
  TX: "texas",
  UT: "utah",
  VT: "vermont",
  VA: "virginia",
  WA: "washington",
  WV: "west virginia",
  WI: "wisconsin",
  WY: "wyoming",
  DC: "district of columbia",
};

const NAME_TO_CODE = new Map(Object.entries(US_STATES).map(([code, name]) => [name, code]));

export function normalizeUsState(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  if (!normalized) return undefined;

  const upper = normalized.toUpperCase();
  if (US_STATES[upper]) return upper;

  return NAME_TO_CODE.get(normalized.toLowerCase());
}

export function extractUsStatePreference(text: string): { code?: string; openAnywhere: boolean } {
  if (/\b(anywhere|open anywhere|open to anywhere|nationwide|nationally|no preference)\b/i.test(text)) {
    return { openAnywhere: true };
  }

  const lower = text.toLowerCase();
  for (const [code, name] of Object.entries(US_STATES)) {
    if (new RegExp(`\\b${escapeRegex(name)}\\b`, "i").test(lower)) {
      return { code, openAnywhere: false };
    }
  }

  const contextualCode = text.match(/\b(?:in|near|around|from|state|within)\s+([a-z]{2})\b/i)?.[1];
  const allCapsCode = text.match(/\b([A-Z]{2})\b/)?.[1];
  const code = normalizeUsState(contextualCode ?? allCapsCode);
  return { code, openAnywhere: false };
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
