export const GUILD_WAR_SIGNUP_TEMPLATE_DEFAULT = 3;
export const GUILD_WAR_MAX_SIGNUPS = 30;

/** Stored in DB; UI labels mapped below */
export const GUILD_WAR_DUTY_KEYS = ["dps", "tank", "heal", "flex"] as const;
export type GuildWarDutyKey = (typeof GUILD_WAR_DUTY_KEYS)[number];

export const GUILD_WAR_DUTY_LABEL: Record<GuildWarDutyKey, string> = {
  dps: "DPS",
  tank: "TANK",
  heal: "Heal",
  flex: "Can Fill any",
};

/** Timezone label for IST schedule display (+05:30) */
export const GUILD_WAR_EVENT_TZ = "Asia/Kolkata";

export function dutyIcon(key: GuildWarDutyKey): string {
  switch (key) {
    case "dps":
      return "⚔️";
    case "tank":
      return "🛡️";
    case "heal":
      return "💉";
    case "flex":
      return "🤡";
  }
}

/** PostgREST may return FK embed as row or singleton array */
export function parseEmbeddedDutySignup(raw: unknown): {
  id: string;
  participant_name: string;
  duty_role: GuildWarDutyKey;
} | null {
  const row = Array.isArray(raw) ? raw[0] : raw;
  if (!row || typeof row !== "object") return null;
  const o = row as Record<string, unknown>;
  const id = o.id;
  const name = o.participant_name;
  const duty = o.duty_role;
  if (
    typeof id !== "string" ||
    typeof name !== "string" ||
    typeof duty !== "string" ||
    !GUILD_WAR_DUTY_KEYS.includes(duty as GuildWarDutyKey)
  ) {
    return null;
  }
  return { id, participant_name: name, duty_role: duty as GuildWarDutyKey };
}
