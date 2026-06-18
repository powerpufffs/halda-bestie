import type { LifecycleStage, StudentProfileState } from "./types.ts";

interface LifecycleInference {
  stage: LifecycleStage;
  confidence: number;
  reason: string;
}

const stagePatterns: Array<{
  stage: LifecycleStage;
  confidence: number;
  patterns: RegExp[];
  reason: string;
}> = [
  {
    stage: "sophomore",
    confidence: 0.95,
    patterns: [/\bsophomore\b/i, /\b10th\b/i, /\bgrade 10\b/i],
    reason: "student mentioned sophomore or 10th grade",
  },
  {
    stage: "junior",
    confidence: 0.95,
    patterns: [/\bjunior\b/i, /\b11th\b/i, /\bgrade 11\b/i],
    reason: "student mentioned junior or 11th grade",
  },
  {
    stage: "senior",
    confidence: 0.95,
    patterns: [/\bsenior\b/i, /\b12th\b/i, /\bgrade 12\b/i],
    reason: "student mentioned senior or 12th grade",
  },
  {
    stage: "transfer",
    confidence: 0.9,
    patterns: [/\btransfer\b/i, /\btransferring\b/i, /\bcommunity college\b/i],
    reason: "student mentioned transfer context",
  },
  {
    stage: "current_college",
    confidence: 0.8,
    patterns: [/\bin college\b/i, /\bcollege student\b/i, /\bfreshman in college\b/i],
    reason: "student mentioned current college context",
  },
  {
    stage: "gap_year",
    confidence: 0.8,
    patterns: [/\bgap year\b/i, /\btook a year off\b/i],
    reason: "student mentioned a gap year",
  },
];

export function inferLifecycleStage(text: string, profile: StudentProfileState): LifecycleInference {
  for (const candidate of stagePatterns) {
    if (candidate.patterns.some((pattern) => pattern.test(text))) {
      return {
        stage: candidate.stage,
        confidence: candidate.confidence,
        reason: candidate.reason,
      };
    }
  }

  if (profile.lifecycleStage !== "unknown") {
    return {
      stage: profile.lifecycleStage,
      confidence: profile.lifecycleStageConfidence,
      reason: "kept existing lifecycle stage",
    };
  }

  return {
    stage: "unknown",
    confidence: 0,
    reason: "no lifecycle stage signal found",
  };
}
