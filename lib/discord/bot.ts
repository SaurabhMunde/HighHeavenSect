import {
  ActivityType,
  Client,
  GatewayIntentBits,
  type Guild,
  type GuildMember,
} from "discord.js";

import { getDiscordEnv } from "@/lib/discord/env";
import {
  getEffectiveMemberRows,
  lookupInGameName,
  normalizeDiscordIdentityKey,
} from "@/lib/discord/ingame-map";
import { refreshInGameMapFromDiscordWithCache } from "@/lib/discord/roster-sync";
import { matchesSiteLeadershipRoster } from "@/lib/discord/leadership-keys";
import type {
  DiscordMemberApiRow,
  DiscordPresenceStatusApi,
  DiscordRosterApiPayload,
  DiscordRosterStats,
  RosterMappingEligibleNoIgnRow,
  RosterMappingOrphanMemberRow,
} from "@/lib/discord/types";
import type { Member } from "@/lib/members";

declare global {
  var __discordRosterLastOnlineMs: Map<string, number> | undefined;
  var __discordRosterClient: Client | undefined;
  var __discordRosterLogin: Promise<Client> | undefined;
}

const WWM_ACTIVITY_SUBSTRING = "Where Winds Meet";
const DISPLAY_PLAYING_WWM = "Playing Where Winds Meet";

const ROLE_HEAD = "WWM Head";
const ROLE_MEMBER = "WWM Member";

/** Fixed top-3 leadership strip (matches Discord display names, case-insensitive). */
const FIXED_HEAD_NAMES = ["demonsau", "linqi", "james venom"] as const;

let lastSuccessfulMemberGatewaySyncMs = 0;
let memberGatewaySyncPromise: Promise<void> | null = null;

function fixedHeadSortIndex(discordDisplayName: string): number {
  const n = discordDisplayName.trim().toLowerCase();
  return FIXED_HEAD_NAMES.indexOf(n as (typeof FIXED_HEAD_NAMES)[number]);
}

function isFixedHeadDiscordName(discordDisplayName: string): boolean {
  return fixedHeadSortIndex(discordDisplayName) !== -1;
}

/** Head UX section: fixed trio → Discord WWM Head role → matched `/leadership`. */
function belongsInHeadUxSection(row: DiscordMemberApiRow): boolean {
  return (
    isFixedHeadDiscordName(row.discordName) ||
    row.discordHasHeadRole ||
    row.matchedSiteLeadership
  );
}

/** 0 = fixed trio bucket, 1 = Discord WWM Head, 2 = site leadership only. */
function headUxPrimaryBucket(row: DiscordMemberApiRow): number {
  if (isFixedHeadDiscordName(row.discordName)) return 0;
  if (row.discordHasHeadRole) return 1;
  return 2;
}

function compareHeadUxSection(a: DiscordMemberApiRow, b: DiscordMemberApiRow): number {
  const ba = headUxPrimaryBucket(a);
  const bb = headUxPrimaryBucket(b);
  if (ba !== bb) return ba - bb;

  if (ba === 0 && bb === 0) {
    return fixedHeadSortIndex(a.discordName) - fixedHeadSortIndex(b.discordName);
  }

  return a.discordName.localeCompare(b.discordName, undefined, {
    sensitivity: "base",
  });
}

function presenceTierForMemberSections(
  status: DiscordPresenceStatusApi,
): number {
  if (status === "in-game") return 0;
  if (status === "online") return 1;
  if (status === "idle") return 2;
  return 3;
}

function compareMemberSubsections(a: DiscordMemberApiRow, b: DiscordMemberApiRow): number {
  const ra = presenceTierForMemberSections(a.status);
  const rb = presenceTierForMemberSections(b.status);
  if (ra !== rb) return ra - rb;
  return a.discordName.localeCompare(b.discordName, undefined, {
    sensitivity: "base",
  });
}

function annotateAndOrderRoster(rows: DiscordMemberApiRow[]): DiscordMemberApiRow[] {
  const heads = rows.filter(belongsInHeadUxSection).sort(compareHeadUxSection);

  const rest = rows.filter((r) => !belongsInHeadUxSection(r));
  const mapped = [...rest.filter((r) => r.inGameName != null)].sort(
    compareMemberSubsections,
  );
  const other = [...rest.filter((r) => r.inGameName == null)].sort(
    compareMemberSubsections,
  );

  for (const r of heads) {
    r.rosterSection = "head";
  }
  for (const r of mapped) {
    r.rosterSection = "member_mapped";
  }
  for (const r of other) {
    r.rosterSection = "member_other";
  }

  return [...heads, ...mapped, ...other];
}

function computeRosterStats(rows: DiscordMemberApiRow[]): DiscordRosterStats {
  let discordWwmMemberRoleCount = 0;
  let discordWwmHeadRoleCount = 0;
  let rosterMappedIgnCount = 0;
  let rosterUnmappedIgnCount = 0;

  for (const r of rows) {
    if (r.inGameName != null) rosterMappedIgnCount += 1;
    else rosterUnmappedIgnCount += 1;
    if (r.discordHasMemberRole) discordWwmMemberRoleCount += 1;
    if (r.discordHasHeadRole) discordWwmHeadRoleCount += 1;
  }

  return {
    discordWwmMemberRoleCount,
    discordWwmHeadRoleCount,
    rosterMappedIgnCount,
    rosterUnmappedIgnCount,
  };
}

function getLastOnlineMap(): Map<string, number> {
  if (!globalThis.__discordRosterLastOnlineMs) {
    globalThis.__discordRosterLastOnlineMs = new Map<string, number>();
  }
  return globalThis.__discordRosterLastOnlineMs;
}

function attachPresenceTracking(client: Client): void {
  client.removeAllListeners("presenceUpdate");

  client.on("presenceUpdate", (_old, neu) => {
    const uid = neu.userId;
    if (!uid) return;

    const s = neu.status;
    const last = getLastOnlineMap();

    if (s && s !== "offline") {
      last.set(uid, Date.now());
    }
  });
}

function primaryActivityLabel(member: GuildMember): string | null {
  const activities = member.presence?.activities ?? [];
  const playing = activities.find((a) => a.type === ActivityType.Playing && a.name);
  if (playing?.name) return `Playing ${playing.name}`;
  const custom = activities.find((a) => a.type === ActivityType.Custom && a.state);
  if (custom?.state) return custom.state;
  const listening = activities.find((a) => a.type === ActivityType.Listening && a.name);
  if (listening?.name) return `Listening to ${listening.name}`;
  const streaming = activities.find((a) => a.type === ActivityType.Streaming && a.name);
  if (streaming?.name) return `Streaming ${streaming.name}`;
  return null;
}

function isPlayingWhereWindsMeet(member: GuildMember): boolean {
  const activities = member.presence?.activities ?? [];
  const needle = WWM_ACTIVITY_SUBSTRING.toLowerCase();
  for (const a of activities) {
    const name = a.name?.toLowerCase() ?? "";
    const details = a.details?.toLowerCase() ?? "";
    const state = a.state?.toLowerCase() ?? "";
    if (name.includes(needle) || details.includes(needle) || state.includes(needle)) {
      return true;
    }
  }
  return false;
}

function resolveDiscordStatus(member: GuildMember): {
  status: DiscordMemberApiRow["status"];
  activity: string | null;
} {
  const discordActivity = primaryActivityLabel(member);
  if (isPlayingWhereWindsMeet(member)) {
    return { status: "in-game", activity: DISPLAY_PLAYING_WWM };
  }
  const presenceStatus = member.presence?.status;
  if (presenceStatus === "online") {
    return { status: "online", activity: discordActivity };
  }
  if (presenceStatus === "idle") {
    return { status: "idle", activity: discordActivity };
  }
  if (presenceStatus === "dnd") {
    return { status: "dnd", activity: discordActivity };
  }
  return { status: "offline", activity: discordActivity };
}

function parseGatewayRetryAfterMs(err: unknown): number | null {
  const msg = err instanceof Error ? err.message : String(err);
  const m = msg.match(/Retry after ([0-9.]+)s/i);
  if (m?.[1]) {
    const sec = Number(m[1]);
    if (Number.isFinite(sec) && sec > 0) return Math.ceil(sec * 1000);
  }
  return null;
}

function isLikelyDiscordRateLimit(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /rate.?limit|429|too many requests|opcode 8/i.test(msg);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function ensureMemberListGatewaySyncInternal(guild: Guild): Promise<void> {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      await guild.members.fetch({ withPresences: false });
      await guild.roles.fetch().catch(() => {
        /** Non-fatal */
      });
      return;
    } catch (err) {
      if (!isLikelyDiscordRateLimit(err)) throw err;
      const backoff = parseGatewayRetryAfterMs(err) ?? Math.min(2000 * 2 ** attempt, 60_000);
      if (attempt === 3) throw err;
      await sleep(backoff);
    }
  }
}

/**
 * Performs a full member list sync only on cold start or every `DISCORD_FULL_MEMBER_SYNC_MS`.
 * Concurrent route handlers share one in-flight sync.
 */
async function ensureMemberListGatewaySync(guild: Guild): Promise<void> {
  const fullSyncMs = Number(process.env.DISCORD_FULL_MEMBER_SYNC_MS ?? 300_000);
  const now = Date.now();

  const cold = lastSuccessfulMemberGatewaySyncMs === 0;
  const periodic = now - lastSuccessfulMemberGatewaySyncMs >= fullSyncMs;

  if (!cold && !periodic) return;

  if (memberGatewaySyncPromise) {
    await memberGatewaySyncPromise;
    return;
  }

  memberGatewaySyncPromise = (async () => {
    try {
      await ensureMemberListGatewaySyncInternal(guild);
      lastSuccessfulMemberGatewaySyncMs = Date.now();
    } finally {
      memberGatewaySyncPromise = null;
    }
  })();

  await memberGatewaySyncPromise;
}

function formatLastActive(userId: string, status: DiscordMemberApiRow["status"]) {
  if (status !== "offline") return null;

  const t = getLastOnlineMap().get(userId);
  if (t == null) return null;

  const hours = Math.max(0, (Date.now() - t) / 3_600_000);
  if (hours < 1) return "Last active < 1 hr ago";
  return `Last active ${Math.floor(hours)} hrs ago`;
}

async function ensureClient(): Promise<Client> {
  const { token } = getDiscordEnv();

  if (!token) {
    throw new Error("DISCORD_BOT_TOKEN is not set or empty after trimming.");
  }

  if (globalThis.__discordRosterClient) {
    return globalThis.__discordRosterClient;
  }

  if (!globalThis.__discordRosterLogin) {
    const client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildVoiceStates,
      ],
    });

    attachPresenceTracking(client);

    globalThis.__discordRosterLogin = client
      .login(token)
      .then(() => {
        globalThis.__discordRosterClient = client;
        return client;
      })
      .catch((err) => {
        globalThis.__discordRosterLogin = undefined;
        throw err;
      });
  }

  return globalThis.__discordRosterLogin;
}

export async function getDiscordBotClient(): Promise<Client> {
  return ensureClient();
}

export async function sendDiscordChannelMessage(
  channelId: string,
  content: string,
): Promise<void> {
  const client = await ensureClient();
  const ch = await client.channels.fetch(channelId);
  if (!ch?.isTextBased() || !ch.isSendable()) {
    throw new Error(`Discord channel ${channelId} is not sendable or not found.`);
  }
  const text = content.trim().slice(0, 2000);
  if (!text.length) throw new Error("Empty Discord message content.");
  await ch.send({ content: text });
}

function guildMemberToRow(member: GuildMember): DiscordMemberApiRow | null {
  if (member.user?.bot) return null;

  const discordHasHeadRole = member.roles.cache.some((rr) => rr.name === ROLE_HEAD);
  const discordHasMemberRole = member.roles.cache.some(
    (rr) => rr.name === ROLE_MEMBER,
  );

  const role = discordHasHeadRole
    ? "WWM Head"
    : discordHasMemberRole
      ? "WWM Member"
      : null;
  if (!role) return null;

  const discordName =
    member.displayName ??
    member.user.globalName ??
    member.user.username ??
    "Unknown";
  const { status, activity } = resolveDiscordStatus(member);
  const vc = member.voice.channel?.name ?? null;

  const inGameName = lookupInGameName(member);
  const matchedSiteLeadership = matchesSiteLeadershipRoster(member);

  return {
    id: member.id,
    discordName,
    avatar: member.user.displayAvatarURL({ extension: "png", size: 128 }),
    role,
    inGameName,
    status,
    activity,
    voiceChannel: vc,
    lastActive: formatLastActive(member.id, status),
    rosterSection: "member_other",
    matchedSiteLeadership,
    discordHasHeadRole,
    discordHasMemberRole,
  };
}

/** Fetches roster payload: members (ordered), stats. */
export async function fetchDiscordRosterPayload(): Promise<DiscordRosterApiPayload> {
  const { guildId } = getDiscordEnv();
  if (!guildId)
    throw new Error("DISCORD_GUILD_ID is not set or empty after trimming.");

  const client = await ensureClient();
  await refreshInGameMapFromDiscordWithCache(client);

  const guild =
    client.guilds.cache.get(guildId) ?? (await client.guilds.fetch(guildId));

  await ensureMemberListGatewaySync(guild);

  const rows: DiscordMemberApiRow[] = [];

  for (const member of guild.members.cache.values()) {
    try {
      const row = guildMemberToRow(member);
      if (row) rows.push(row);
    } catch {
      /* skip malformed member */
    }
  }

  const stats = computeRosterStats(rows);
  const members = annotateAndOrderRoster(rows);

  return { members, stats };
}

function memberMapperKeysNormalized(member: GuildMember): string[] {
  const raw = [
    member.id,
    member.nickname,
    member.user.globalName,
    member.user.username,
    member.displayName,
  ].filter((x): x is string => Boolean(x?.trim()));

  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const value of raw) {
    const k = normalizeDiscordIdentityKey(value);
    if (!k.length) continue;
    if (!seen.has(k)) {
      seen.add(k);
      ordered.push(k);
    }
  }
  return ordered;
}

function mapperKeysRegisteredForMemberRow(row: Member): string[] {
  const keys = [row.discord, ...(row.discordAliases ?? [])]
    .map((s) => normalizeDiscordIdentityKey(s))
    .filter(Boolean);
  return [...new Set(keys)];
}

/**
 * Compared live guild (WWM roles) ↔ effective roster rows: who lacks IGN rows, which roster rows never resolve.
 */
export async function computeRosterMappingDiagnostics(): Promise<{
  rosterLineCount: number;
  guildEligibleMemberCount: number;
  guildMembersWithMappedIgnCount: number;
  eligibleDiscordMembersMissingIgnMapping: RosterMappingEligibleNoIgnRow[];
  rosterLinesWithNoMatchingGuildIgn: RosterMappingOrphanMemberRow[];
}> {
  const { guildId } = getDiscordEnv();
  if (!guildId)
    throw new Error("DISCORD_GUILD_ID is not set or empty after trimming.");

  const client = await ensureClient();
  await refreshInGameMapFromDiscordWithCache(client);

  const guild =
    client.guilds.cache.get(guildId) ?? (await client.guilds.fetch(guildId));

  await ensureMemberListGatewaySync(guild);

  const matchedInGames = new Set<string>();
  const eligibleDiscordMembersMissingIgnMapping: RosterMappingEligibleNoIgnRow[] =
    [];
  let guildEligibleMemberCount = 0;

  for (const member of guild.members.cache.values()) {
    if (member.user?.bot) continue;

    const discordHasHeadRole = member.roles.cache.some((rr) => rr.name === ROLE_HEAD);
    const discordHasMemberRole = member.roles.cache.some(
      (rr) => rr.name === ROLE_MEMBER,
    );
    const eligible = discordHasHeadRole || discordHasMemberRole;
    if (!eligible) continue;

    guildEligibleMemberCount += 1;

    const ign = lookupInGameName(member);
    if (ign) {
      matchedInGames.add(ign);
      continue;
    }

    const discordDisplayName =
      member.displayName ??
      member.user?.globalName ??
      member.user?.username ??
      "Unknown";

    eligibleDiscordMembersMissingIgnMapping.push({
      userId: member.id,
      discordDisplayName,
      nickname: member.nickname ?? null,
      globalName: member.user.globalName ?? null,
      username: member.user.username,
      mapperKeysSeen: memberMapperKeysNormalized(member),
    });
  }

  const rosterLinesWithNoMatchingGuildIgn: RosterMappingOrphanMemberRow[] =
    [...getEffectiveMemberRows()]
      .filter((row) => !matchedInGames.has(row.inGame))
      .sort((a, b) =>
        a.inGame.localeCompare(b.inGame, undefined, { sensitivity: "base" }),
      )
      .map((row) => ({
        inGame: row.inGame,
        discord: row.discord,
        discordAliases: row.discordAliases ?? [],
        mapperKeysRegistered: mapperKeysRegisteredForMemberRow(row),
      }));

  eligibleDiscordMembersMissingIgnMapping.sort((a, b) =>
    a.discordDisplayName.localeCompare(b.discordDisplayName, undefined, {
      sensitivity: "base",
    }),
  );

  return {
    rosterLineCount: getEffectiveMemberRows().length,
    guildEligibleMemberCount,
    guildMembersWithMappedIgnCount: matchedInGames.size,
    eligibleDiscordMembersMissingIgnMapping,
    rosterLinesWithNoMatchingGuildIgn,
  };
}
