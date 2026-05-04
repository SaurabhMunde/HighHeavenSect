/** Normalize values that often break when copy-pasted into `.env.local`. */
export function getDiscordEnv(): { token: string | undefined; guildId: string | undefined } {
  const tidy = (raw: string | undefined) => {
    if (raw == null) return undefined;
    let s = raw.replace(/^\uFEFF/, "").trim();
    if (
      (s.startsWith('"') && s.endsWith('"')) ||
      (s.startsWith("'") && s.endsWith("'"))
    ) {
      s = s.slice(1, -1).trim();
    }
    return s || undefined;
  };

  return {
    token: tidy(process.env.DISCORD_BOT_TOKEN),
    guildId: tidy(process.env.DISCORD_GUILD_ID),
  };
}

export type DiscordRosterColumnOrder = "ign-first" | "discord-first";

/** Optional: IGN roster text lives in a guild thread; bot reads starter (or a specific message) and parses rows. */
export function getDiscordRosterSourceEnv(): {
  threadId: string | undefined;
  /** If set, must match `ThreadChannel.parentId` (safety check). */
  parentChannelId: string | undefined;
  /** If unset, uses `ThreadChannel.fetchStarterMessage()`. */
  messageId: string | undefined;
  ttlMs: number;
  columnOrder: DiscordRosterColumnOrder;
} {
  const tidy = (raw: string | undefined) => {
    if (raw == null) return undefined;
    let s = raw.replace(/^\uFEFF/, "").trim();
    if (
      (s.startsWith('"') && s.endsWith('"')) ||
      (s.startsWith("'") && s.endsWith("'"))
    ) {
      s = s.slice(1, -1).trim();
    }
    return s || undefined;
  };

  const orderRaw = tidy(process.env.DISCORD_ROSTER_COLUMN_ORDER)?.toLowerCase();
  const columnOrder: DiscordRosterColumnOrder =
    orderRaw === "discord-first" ? "discord-first" : "ign-first";

  const ttlRaw = tidy(process.env.DISCORD_ROSTER_SOURCE_TTL_MS);
  const ttlParsed = ttlRaw != null ? Number(ttlRaw) : NaN;
  const ttlMs = Number.isFinite(ttlParsed) && ttlParsed >= 5_000 ? ttlParsed : 120_000;

  return {
    threadId: tidy(process.env.DISCORD_ROSTER_THREAD_ID),
    parentChannelId: tidy(process.env.DISCORD_ROSTER_THREAD_PARENT_CHANNEL_ID),
    messageId: tidy(process.env.DISCORD_ROSTER_MESSAGE_ID),
    ttlMs,
    columnOrder,
  };
}
