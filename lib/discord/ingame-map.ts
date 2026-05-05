import type { GuildMember } from "discord.js";

import { EMPTY_ROSTER, type Member } from "@/lib/members";

/**
 * Normalizes Discord identity keys so roster rows like "@Re:shanto" still match
 * member names such as "Re:shanto" from display/global/username fields.
 */
export function normalizeDiscordIdentityKey(value: string): string {
  const raw = value.trim();
  if (!raw.length) return "";

  // Discord user mention token: <@123...> or <@!123...>
  const mention = raw.match(/^<@!?(\d+)>$/);
  if (mention) return mention[1] ?? "";

  return raw.replace(/^@+/, "").replace(/\s+/g, " ").toLowerCase();
}

/** Discord roster name (`discord` + `discordAliases`) → in-game tag. Keys compared case-insensitively. */
function buildInsensitiveMap(rows: readonly Member[]): Map<string, string> {
  const m = new Map<string, string>();

  const add = (label: string, inGame: string) => {
    const k = normalizeDiscordIdentityKey(label);
    if (k.length) m.set(k, inGame);
  };

  for (const row of rows) {
    add(row.discord, row.inGame);
    for (const alias of row.discordAliases ?? []) add(alias, row.inGame);
  }
  return m;
}

let effectiveRows: Member[] = [...EMPTY_ROSTER];
let ingameByDiscordKey = buildInsensitiveMap(effectiveRows);

export function applyMemberRows(rows: Member[]): void {
  effectiveRows = rows;
  ingameByDiscordKey = buildInsensitiveMap(rows);
}

export function resetMemberRowsToStatic(): void {
  effectiveRows = [...EMPTY_ROSTER];
  ingameByDiscordKey = buildInsensitiveMap(effectiveRows);
}

/** Rows used for IGN lookup and diagnostics (Discord thread when synced). */
export function getEffectiveMemberRows(): readonly Member[] {
  return effectiveRows;
}

/**
 * Lookup in-game name from member identity.
 * Keys match roster `discord` strings (nickname, global name, username, or computed display).
 */
export function lookupInGameName(member: GuildMember): string | null {
  const candidates = [
    member.id,
    member.nickname,
    member.user.globalName,
    member.user.username,
    member.displayName,
  ].filter((x): x is string => Boolean(x?.trim()));

  const seen = new Set<string>();
  for (const raw of candidates) {
    const key = normalizeDiscordIdentityKey(raw);
    if (!key.length) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    const hit = ingameByDiscordKey.get(key);
    if (hit) return hit;
  }
  return null;
}
