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
