import type { GuildMember } from "discord.js";

import { MEMBERS } from "@/lib/members";

/** Discord roster name (`discord` + `discordAliases`) → in-game tag. Keys compared case-insensitively. */
function buildInsensitiveMap(): Map<string, string> {
  const m = new Map<string, string>();

  const add = (label: string, inGame: string) => {
    const k = label.trim().toLowerCase();
    if (k.length) m.set(k, inGame);
  };

  for (const row of MEMBERS) {
    add(row.discord, row.inGame);
    for (const alias of row.discordAliases ?? []) add(alias, row.inGame);
  }
  return m;
}

const INGAME_BY_DISCORD_KEY = buildInsensitiveMap();

/**
 * Lookup in-game name from member identity.
 * Keys match roster `discord` strings (nickname, global name, username, or computed display).
 */
export function lookupInGameName(member: GuildMember): string | null {
  const candidates = [
    member.nickname,
    member.user.globalName,
    member.user.username,
    member.displayName,
  ].filter((x): x is string => Boolean(x?.trim()));

  const seen = new Set<string>();
  for (const raw of candidates) {
    const key = raw.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const hit = INGAME_BY_DISCORD_KEY.get(key);
    if (hit) return hit;
  }
  return null;
}
