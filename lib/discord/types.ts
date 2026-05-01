export type DiscordPresenceStatusApi =
  | "in-game"
  | "online"
  | "idle"
  | "dnd"
  | "offline";

export type DiscordRosterSection = "head" | "member_mapped" | "member_other";

/** Where this row appears — assigned server-side so the client does not re-sort. */
export type DiscordMemberApiRow = {
  id: string;
  discordName: string;
  avatar: string;
  role: "WWM Head" | "WWM Member";
  inGameName: string | null;
  status: DiscordPresenceStatusApi;
  activity: string | null;
  voiceChannel: string | null;
  lastActive: string | null;
  rosterSection: DiscordRosterSection;
  /** Matches `/leadership` identity keys (nickname / global / username / display name). */
  matchedSiteLeadership: boolean;
  /** Has Discord role "WWM Head" (shown in roster stats independently of head section UX). */
  discordHasHeadRole: boolean;
  /** Has Discord role "WWM Member". */
  discordHasMemberRole: boolean;
};

export type DiscordRosterStats = {
  discordWwmMemberRoleCount: number;
  discordWwmHeadRoleCount: number;
  rosterMappedIgnCount: number;
  rosterUnmappedIgnCount: number;
};

export type DiscordRosterApiPayload = {
  members: DiscordMemberApiRow[];
  stats: DiscordRosterStats;
};

/** `GET /api/discord-roster-diagnostic` when `DISCORD_ROSTER_DIAGNOSTIC=1` */
export type RosterMappingEligibleNoIgnRow = {
  userId: string;
  discordDisplayName: string;
  nickname: string | null;
  globalName: string | null;
  username: string;
  /** Exact strings normalized for lookup — add one match to roster `discord` or `discordAliases`. */
  mapperKeysSeen: string[];
};

export type RosterMappingOrphanMemberRow = {
  inGame: string;
  discord: string;
  discordAliases: string[];
  /** Keys currently registered from this roster row (normalized). */
  mapperKeysRegistered: string[];
};
