import type { Client } from "discord.js";

import { getDiscordRosterSourceEnv } from "@/lib/discord/env";
import { fetchRosterMembersFromDiscord } from "@/lib/discord/roster-message";
import {
  applyMemberRows,
  resetMemberRowsToStatic,
} from "@/lib/discord/ingame-map";
import type { Member } from "@/lib/members";

let lastFetchMs = 0;
let lastGoodRows: Member[] | null = null;

/**
 * When `DISCORD_ROSTER_THREAD_ID` is set, refetches parsed roster from Discord (TTL).
 * On failure, keeps last good Discord snapshot or clears to an empty map.
 */
export async function refreshInGameMapFromDiscordWithCache(
  client: Client,
): Promise<void> {
  const env = getDiscordRosterSourceEnv();
  if (!env.threadId) {
    resetMemberRowsToStatic();
    lastGoodRows = null;
    lastFetchMs = 0;
    return;
  }

  const now = Date.now();
  if (lastGoodRows && now - lastFetchMs < env.ttlMs) {
    applyMemberRows(lastGoodRows);
    return;
  }

  try {
    const members = await fetchRosterMembersFromDiscord(client, env);
    lastFetchMs = now;
    lastGoodRows = members;
    applyMemberRows(members);
  } catch {
    if (lastGoodRows) {
      applyMemberRows(lastGoodRows);
    } else {
      resetMemberRowsToStatic();
      lastGoodRows = null;
    }
  }
}
