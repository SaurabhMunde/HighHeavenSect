/** Summarize Discord / gateway failures for logs and (in dev) JSON responses. Never include tokens. */
export function formatDiscordFailure(err: unknown): {
  message: string;
  code?: number | string;
  hint?: string;
} {
  const message = err instanceof Error ? err.message : String(err);
  let code: number | string | undefined;

  if (err && typeof err === "object") {
    const o = err as Record<string, unknown>;
    if (typeof o.code === "number" || typeof o.code === "string") {
      code = o.code as number | string;
    }
    if (typeof o.status === "number" && code === undefined) {
      code = `http ${o.status}`;
    }
  }

  const lower = message.toLowerCase();
  let hint: string | undefined;

  if (
    lower.includes("invalid token") ||
    lower.includes("tokeninvalid") ||
    lower.includes('"code":400') ||
    /(^|\D)401(\D|$)/.test(message)
  ) {
    hint =
      "Invalid or expired bot token — open Developer Portal → Bot → Reset Token, update DISCORD_BOT_TOKEN with no stray spaces/quotes, restart the server.";
  } else if (
    code === 4014 ||
    lower.includes("disallowed intents") ||
    lower.includes("used disallowed intents")
  ) {
    hint =
      "Discord blocked the connection: enable Server Members Intent and Presence Intent for the bot (Developer Portal → Bot), save, restart `npm run dev`.";
  } else if (code === 10004 || lower.includes("unknown guild")) {
    hint =
      "Guild not found — confirm DISCORD_GUILD_ID is the server snowflake (right‑click server with Developer Mode) and this bot has been invited to that server.";
  } else if (code === 50013 || code === 50001 || lower.includes("missing permissions")) {
    hint =
      "The bot lacks permissions in this guild — invite it again with scopes that include View Channels (and reconnect if kicks changed). Member list fetch may still need Manage Roles / privileged member visibility depending on guild settings.";
  } else if (lower.includes("opcode 8") || lower.includes("rate limited")) {
    hint =
      "Discord temporarily limited guild member syncing (gateway opcode 8). The API only performs a full member sync on an interval — wait a few seconds and reload. If this persists, increase DISCORD_FULL_MEMBER_SYNC_MS in `.env.local`.";
  }

  return { message, code, hint };
}
