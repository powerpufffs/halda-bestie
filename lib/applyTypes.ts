// Domain types + storage keys for the "Senior Year: Apply" hub tools.

export const STORAGE_KEYS = {
  activities: "cp.activities",
  deadlines: "cp.deadlines",
  offers: "cp.offers",
} as const;

/* --------------------------- Activities -------------------------------- */

export const ACTIVITY_TYPES = [
  "Academic",
  "Art",
  "Athletics: Club",
  "Athletics: JV/Varsity",
  "Community Service",
  "Career-Oriented",
  "Cultural",
  "Debate / Speech",
  "Environmental",
  "Family Responsibilities",
  "Music: Instrumental",
  "Music: Vocal",
  "Religious",
  "Research",
  "Robotics",
  "Student Govt / Politics",
  "Theater / Drama",
  "Work (Paid)",
  "Other Club / Activity",
] as const;

export interface Activity {
  id: string;
  activityType: string;
  position: string;
  organization: string;
  /** Common App caps this at 150 characters. */
  description: string;
}

/* ---------------------------- Deadlines -------------------------------- */

export type ApplicationRound = "ED" | "ED II" | "EA" | "REA" | "RD" | "Rolling";
export const ROUNDS: ApplicationRound[] = ["ED", "ED II", "EA", "REA", "RD", "Rolling"];

export type DeadlineStatus =
  | "Not Started"
  | "In Progress"
  | "Submitted"
  | "Decision Received";

export const DEADLINE_STATUSES: DeadlineStatus[] = [
  "Not Started",
  "In Progress",
  "Submitted",
  "Decision Received",
];

export interface Deadline {
  id: string;
  school: string;
  round: ApplicationRound;
  /** ISO date string (yyyy-mm-dd). */
  date: string;
  status: DeadlineStatus;
}

/* --------------------------- Decisions --------------------------------- */

export type OfferStatus = "Pending" | "Accepted" | "Waitlisted" | "Denied";
export const OFFER_STATUSES: OfferStatus[] = ["Pending", "Accepted", "Waitlisted", "Denied"];

export interface Offer {
  id: string;
  school: string;
  status: OfferStatus;
  /** Total cost of attendance (tuition + room & board), USD. */
  cost: number;
  /** Grants + scholarships (money you don't repay), USD. */
  aid: number;
  /** Personal fit score, 1-10. */
  fitScore: number;
  notes: string;
}

export const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
