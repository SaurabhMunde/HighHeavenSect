const KEY = "hhs_guild_player_v1";

/** Stable anonymous id for one browser (giveaways + quiz attempts) */
export function getOrCreatePlayerKey(): string {
  if (typeof window === "undefined") return "server";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id =
      globalThis.crypto?.randomUUID?.() ??
      `p_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(KEY, id);
  }
  return id;
}
