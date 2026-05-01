import { GUILD_WAR_EVENT_TZ } from "@/lib/guild-war";

/** Build UTC ISO from IST calendar `<input type="date">` + `<input type="time">`. */
export function istDateAndTimeToUtcIso(dateIso: string, timeHm: string): string {
  const normalized = `${dateIso.trim()}T${timeHm.trim()}:00+05:30`;
  return new Date(normalized).toISOString();
}

export function formatUtcForIstBadge(isoUtc: string): string {
  try {
    return new Date(isoUtc).toLocaleString("en-IN", {
      timeZone: GUILD_WAR_EVENT_TZ,
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return isoUtc;
  }
}
