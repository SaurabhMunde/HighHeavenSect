import { Routes } from "discord-api-types/v10";
import type { AnyThreadChannel, Client, Message } from "discord.js";

import type { DiscordRosterColumnOrder } from "@/lib/discord/env";
import { getDiscordEnv, getDiscordRosterSourceEnv } from "@/lib/discord/env";
import type { Member } from "@/lib/members";

type RosterSourceEnv = ReturnType<typeof getDiscordRosterSourceEnv>;

function discordApiErrorCode(err: unknown): number | undefined {
  if (err && typeof err === "object" && "code" in err) {
    const c = (err as { code: unknown }).code;
    return typeof c === "number" ? c : undefined;
  }
  return undefined;
}

function isThreadAccessDenied(err: unknown): boolean {
  const code = discordApiErrorCode(err);
  return code === 50001 || code === 10_003;
}

function assertParentMatches(
  ch: AnyThreadChannel,
  expectedParentId: string | undefined,
): void {
  if (expectedParentId && ch.parentId !== expectedParentId) {
    throw new Error(
      `Roster thread parent mismatch: expected ${expectedParentId}, got ${ch.parentId ?? "none"}.`,
    );
  }
}

/**
 * Public threads can still return 50001 Missing Access on `channels.fetch(threadId)` until the bot
 * is a thread member or the thread is resolved via guild/parent thread listings.
 */
async function resolveRosterThreadChannel(
  client: Client,
  env: RosterSourceEnv,
): Promise<AnyThreadChannel> {
  const threadId = env.threadId!;
  const guildId = getDiscordEnv().guildId;
  if (!guildId) {
    throw new Error("DISCORD_GUILD_ID is required to resolve roster thread access.");
  }

  const fetchDirect = async (): Promise<AnyThreadChannel> => {
    const ch = await client.channels.fetch(threadId);
    if (!ch?.isThread()) {
      throw new Error(
        `DISCORD_ROSTER_THREAD_ID ${threadId} did not resolve to a thread channel.`,
      );
    }
    assertParentMatches(ch, env.parentChannelId);
    return ch;
  };

  try {
    return await fetchDirect();
  } catch (err) {
    if (!isThreadAccessDenied(err)) throw err;
  }

  try {
    await client.rest.put(Routes.threadMembers(threadId, "@me"));
  } catch {
    /* already a member, locked thread, or still no route — continue */
  }

  try {
    return await fetchDirect();
  } catch (err) {
    if (!isThreadAccessDenied(err)) throw err;
  }

  const guild =
    client.guilds.cache.get(guildId) ?? (await client.guilds.fetch(guildId));
  const activeGuild = await guild.channels.fetchActiveThreads();
  const fromGuild = activeGuild.threads.get(threadId);
  if (fromGuild) {
    assertParentMatches(fromGuild, env.parentChannelId);
    return fromGuild;
  }

  if (env.parentChannelId) {
    const parent = await client.channels.fetch(env.parentChannelId);
    if (!parent?.isTextBased() || !("threads" in parent)) {
      throw new Error(
        `DISCORD_ROSTER_THREAD_PARENT_CHANNEL_ID ${env.parentChannelId} is not a text/news/forum parent.`,
      );
    }

    const localActive = await parent.threads.fetchActive();
    const tAct = localActive.threads.get(threadId);
    if (tAct) {
      assertParentMatches(tAct, env.parentChannelId);
      return tAct;
    }

    let before: string | undefined;
    for (let page = 0; page < 5; page += 1) {
      const arch = await parent.threads.fetchArchived({
        limit: 100,
        ...(before ? { before } : {}),
      });
      const tArch = arch.threads.get(threadId);
      if (tArch) {
        assertParentMatches(tArch, env.parentChannelId);
        return tArch;
      }
      if (!arch.hasMore || arch.threads.size === 0) break;
      before = arch.threads.last()?.id;
      if (!before) break;
    }
  }

  throw new Error(
    [
      `Missing Access to roster thread ${threadId} (Discord 50001).`,
      "Fix: grant the bot role **View Channel** + **Read Message History** on the parent channel",
      env.parentChannelId ? `(${env.parentChannelId})` : "(set DISCORD_ROSTER_THREAD_PARENT_CHANNEL_ID)",
      "and **Send Messages in Threads** (or **Send Messages**) so it can join the thread;",
      "or @mention the bot once inside the thread so it becomes a member.",
    ].join(" "),
  );
}

/** Markdown-only lines (e.g. **Current Active Members**) — not roster rows. */
function isMarkdownHeadingOnly(line: string): boolean {
  const t = line.trim();
  return /^\*{1,3}[^*]+\*{1,3}$/.test(t) || /^_{1,3}[^_]+_{1,3}$/.test(t);
}

/**
 * Parses roster text edited in Discord. One member per non-empty line.
 *
 * **Primary (Discord thread list):** `inGame - discord` using **` - `** (space hyphen space) so
 * `|` stays inside names (`Suze雨 | Hiromi`) and IGNs can end with a hyphen (`Sayaka- - Sayaka`).
 *
 * **Legacy (repo / old pastes):** `inGame | discord` or tab; optional `| alias1, alias2`.
 *
 * Skips: empty lines, `#` comments, markdown bullets `- `, heading-only markdown lines.
 * Set `DISCORD_ROSTER_COLUMN_ORDER=discord-first` for `Discord name - IGN`.
 */
export function parseRosterMessageToMembers(
  content: string,
  columnOrder: DiscordRosterColumnOrder,
): Member[] {
  const lines = content.split(/\r?\n/);
  const out: Member[] = [];

  for (let line of lines) {
    line = line.trim();
    if (!line || line.startsWith("#")) continue;
    if (line.startsWith("- ")) line = line.slice(2).trim();
    if (!line || line.startsWith("#")) continue;
    if (isMarkdownHeadingOnly(line)) continue;

    let inGame: string;
    let discord: string;
    let discordAliases: string[] | undefined;

    const dash = " - ";
    const dashIdx = line.indexOf(dash);
    if (dashIdx !== -1) {
      const left = line.slice(0, dashIdx).trim();
      const right = line.slice(dashIdx + dash.length).trim();
      if (!left || !right) continue;
      if (columnOrder === "discord-first") {
        discord = left;
        inGame = right;
      } else {
        inGame = left;
        discord = right;
      }
      discordAliases = undefined;
    } else {
      let parts = line.split("|").map((s) => s.trim());
      if (parts.length < 2) {
        parts = line.split("\t").map((s) => s.trim());
      }
      if (parts.length < 2) continue;

      const [a, b, extra] = parts;
      const colA = a ?? "";
      const colB = b ?? "";
      if (!colA || !colB) continue;

      inGame = columnOrder === "discord-first" ? colB : colA;
      discord = columnOrder === "discord-first" ? colA : colB;
      discordAliases = extra
        ? extra
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined;
      if (!discordAliases?.length) discordAliases = undefined;
    }

    out.push({
      inGame,
      discord,
      ...(discordAliases?.length ? { discordAliases } : {}),
    });
  }

  return out.sort((a, b) =>
    a.inGame.localeCompare(b.inGame, undefined, { sensitivity: "base" }),
  );
}

/**
 * Resolves which Discord message holds the roster table.
 * Forum threads use `fetchStarterMessage()` → GET .../messages/{threadId}; that can be 50001 or empty
 * when the table lives in a different message — then we scan pins + recent messages for parseable rows.
 */
async function pickRosterSourceMessage(
  ch: AnyThreadChannel,
  env: RosterSourceEnv,
): Promise<Message> {
  if (env.messageId) {
    return ch.messages.fetch(env.messageId);
  }

  const rosterParseCount = (raw: string | null | undefined) => {
    const t = raw?.trim() ?? "";
    if (!t) return 0;
    return parseRosterMessageToMembers(t, env.columnOrder).length;
  };

  let starter: Message | null = null;
  try {
    starter = await ch.fetchStarterMessage();
  } catch (e) {
    if (discordApiErrorCode(e) !== 50001) throw e;
  }

  if (starter?.content?.trim()) {
    const n = rosterParseCount(starter.content);
    if (n > 0) return starter;
  }

  const collected: Message[] = [];

  try {
    const pins = await ch.messages.fetchPins();
    for (const row of pins.items) {
      if (row.message.content?.trim()) collected.push(row.message);
    }
  } catch {
    /* no pins or no access */
  }

  try {
    const batch = await ch.messages.fetch({ limit: 100 });
    for (const m of batch.values()) {
      if (m.content?.trim()) collected.push(m);
    }
  } catch (e) {
    if (discordApiErrorCode(e) === 50001 && collected.length === 0) {
      throw new Error(
        [
          "Missing Access reading messages in the roster thread (50001).",
          "Ensure the bot can **Read Message History** in this thread, or set **DISCORD_ROSTER_MESSAGE_ID**",
          "to the roster post (Developer Mode → right-click message → Copy Message Link → id segment).",
        ].join(" "),
      );
    }
    throw e;
  }

  if (starter?.content?.trim()) collected.push(starter);

  const seen = new Set<string>();
  const uniq: Message[] = [];
  for (const m of collected) {
    if (seen.has(m.id)) continue;
    seen.add(m.id);
    uniq.push(m);
  }

  let best: Message | null = null;
  let bestScore = 0;
  for (const m of uniq) {
    const n = rosterParseCount(m.content);
    if (n > bestScore) {
      bestScore = n;
      best = m;
    } else if (
      n === bestScore &&
      n > 0 &&
      best &&
      (m.content?.length ?? 0) > (best.content?.length ?? 0)
    ) {
      best = m;
    }
  }

  if (best && bestScore > 0) return best;
  if (starter?.content?.trim()) return starter;

  throw new Error(
    [
      "Could not find roster text in this thread (no lines matched `IGN - Discord` with ` - `, or legacy `IGN|Discord`).",
      "Either fix the format, or set **DISCORD_ROSTER_MESSAGE_ID** to the roster message id",
      "(Developer Mode → right-click the roster post → Copy Message Link).",
    ].join(" "),
  );
}

/** Loads `Member[]` from the configured roster thread (starter message or `messageId`). */
export async function fetchRosterMembersFromDiscord(
  client: Client,
  env: RosterSourceEnv = getDiscordRosterSourceEnv(),
): Promise<Member[]> {
  if (!env.threadId) {
    throw new Error("DISCORD_ROSTER_THREAD_ID is not set.");
  }

  const ch = await resolveRosterThreadChannel(client, env);

  const msg = await pickRosterSourceMessage(ch, env);

  const raw = msg.content?.trim() ?? "";
  if (!raw) {
    throw new Error(
      "Roster message has no text content (embed-only not supported). Put the table in the message body.",
    );
  }

  const rows = parseRosterMessageToMembers(raw, env.columnOrder);
  if (rows.length === 0) {
    throw new Error(
      "Parsed zero roster rows. Use `IGN - Discord` per line (` - ` delimiter), legacy `IGN|Discord`, or set DISCORD_ROSTER_COLUMN_ORDER=discord-first.",
    );
  }

  return rows;
}
