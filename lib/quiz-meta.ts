export const QUIZ_STATUSES = [
  "draft",
  "simulation",
  "scheduled",
  "live",
  "ended",
] as const;

export type QuizStatus = (typeof QUIZ_STATUSES)[number];

export const QUIZ_TYPES = ["trial", "tournament"] as const;
export type QuizType = (typeof QUIZ_TYPES)[number];

export function statusLabel(status: string) {
  switch (status) {
    case "draft":
      return "editable";
    case "simulation":
      return "test mode (admin only)";
    case "scheduled":
      return "locked";
    case "live":
      return "active for users";
    case "ended":
      return "read-only";
    default:
      return status;
  }
}
