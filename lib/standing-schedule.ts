/**
 * Standing guild rhythm — all clock times are IST (Asia/Kolkata).
 * UI converts to the visitor's local time zone.
 */
export type StandingActivity = {
  id: string;
  title: string;
  /** Days / cadence; plain copy */
  when: string;
  /** extra lines below the main time */
  detail: string;
} & (
  | {
      kind: "single";
      /** Main line, e.g. "Event at {time}" */
      lineTemplate: "at" | "starts";
      hour: number;
      minute: number;
    }
  | {
      kind: "party";
      defaultHour: number;
      defaultMinute: number;
    }
);

export const STANDING_ACTIVITIES: StandingActivity[] = [
  {
    id: "ghr",
    title: "Guild Hero's Realm",
    when: "Mon, Wed, Sat, Sun (Sunday optional)",
    kind: "single",
    lineTemplate: "at",
    hour: 20,
    minute: 0,
    detail: "Kill 2 bosses with 10 members",
  },
  {
    id: "ba",
    title: "Breaking Army",
    when: "Wednesday or Saturday",
    kind: "single",
    lineTemplate: "at",
    hour: 19,
    minute: 30,
    detail: "Solo boss, 2 hour window",
  },
  {
    id: "gp",
    title: "Guild Party",
    when: "Every day (see note for weekend)",
    kind: "party",
    defaultHour: 21,
    defaultMinute: 0,
    detail: "",
  },
  {
    id: "gpvp",
    title: "Guild PvP",
    when: "Thursday & Sunday",
    kind: "single",
    lineTemplate: "at",
    hour: 20,
    minute: 30,
    detail: "Duration: 1 hour",
  },
  {
    id: "gw",
    title: "Guild War",
    when: "Seasonal · Saturday & Sunday",
    kind: "single",
    lineTemplate: "starts",
    hour: 18,
    minute: 0,
    detail: "Duration ~2.5 hours",
  },
];
