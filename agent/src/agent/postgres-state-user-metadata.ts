import type { StudentProfileState } from "./types.ts";

export function userMetadataFromProfile(profile: StudentProfileState): Record<string, unknown> {
  const onboarding = asRecord(profile.facts.onboarding);
  const complete = profile.facts.onboardingComplete === true || onboarding.complete === true;

  return {
    accountStatus: complete ? "identified" : "anonymous",
    anonymous: !complete,
    lifecycleStage: profile.lifecycleStage,
    agentProfileKey: profile.agentProfileKey,
    onboardingComplete: complete,
    firstName: stringValue(profile.facts.firstName) ?? stringValue(onboarding.firstName),
    highSchool: stringValue(profile.facts.highSchool) ?? stringValue(onboarding.highSchool),
    onboardingRole: stringValue(profile.facts.onboardingRole) ?? stringValue(onboarding.role),
    collegeIntent: stringValue(profile.facts.collegeIntent) ?? stringValue(onboarding.collegeIntent),
    gradeLevel: stringValue(profile.facts.gradeLevel) ?? stringValue(onboarding.gradeLevel),
    profileUpdatedAt: new Date().toISOString(),
  };
}

export function userTypeFromProfile(profile: StudentProfileState): string {
  const onboardingRole = stringValue(profile.facts.onboardingRole);
  if (onboardingRole === "supporter") return "guardian";
  if (onboardingRole === "counselor") return "counselor";
  if (onboardingRole === "institution_staff") return "institution_staff";
  return "student";
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
