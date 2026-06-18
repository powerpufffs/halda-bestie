// Shared domain types for the essay editor.

/** Category of an automated suggestion. Mirrors what the LLM returns. */
export type SuggestionType = "Grammar" | "Structure" | "Tone";

/** A single AI grammar/writing suggestion produced by the analyze API. */
export interface AiSuggestion {
  /** Stable client-side id (assigned after fetch). */
  id: string;
  type: SuggestionType;
  /** Verbatim text from the essay this suggestion targets. */
  original: string;
  /** Proposed replacement text. */
  suggestion: string;
  /** Human-readable rationale shown in the sidebar. */
  explanation: string;
  /** UI lifecycle state. */
  status: "pending" | "accepted" | "rejected";
}

/** Raw shape returned by /api/analyze-essay (before we attach id/status). */
export type RawSuggestion = Pick<
  AiSuggestion,
  "type" | "original" | "suggestion" | "explanation"
>;

/** Thematic tag for a piece of counselor advice. */
export type AdviceCategory =
  | "Hook"
  | "Specificity"
  | "Structure"
  | "Voice"
  | "Reflection";

/** Raw counselor advice item from the analyze API. */
export interface RawAdvice {
  /** Actionable, encouraging advice written in a counselor's voice. */
  point: string;
  /** A reflective question the counselor asks to draw out essay material. */
  question?: string;
  /** Optional verbatim quote this advice refers to (underlined yellow). */
  anchor?: string;
  category?: AdviceCategory;
}

/** Counselor advice with a stable client-side id. */
export interface CounselorAdvice extends RawAdvice {
  id: string;
}

/** Who sent a chat message in an advice coaching thread. */
export type ChatRole = "counselor" | "writer";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  text: string;
}

/** Full payload returned by POST /api/analyze-essay. */
export interface AnalyzePayload {
  suggestions: RawSuggestion[];
  advice: RawAdvice[];
  /** Holistic admissions quality score, 1-100. */
  score: number;
  /** One-sentence justification for the score. */
  scoreSummary: string;
}

