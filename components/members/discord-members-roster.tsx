"use client";

import { motion } from "framer-motion";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";

import {
  fetchDiscordMembersRosterDeduplicated,
  readDiscordMembersRosterCache,
} from "@/lib/discord-members-client";
import type {
  DiscordMemberApiRow,
  DiscordRosterApiPayload,
  DiscordRosterStats,
} from "@/lib/discord/types";

const POLL_MS = 15_000;

function statusDisplay(status: DiscordMemberApiRow["status"]) {
  switch (status) {
    case "in-game":
      return { emoji: "🟢", label: "In game — Where Winds Meet" };
    case "online":
      return { emoji: "🟢", label: "Online" };
    case "idle":
      return { emoji: "🟡", label: "Idle" };
    case "dnd":
      return { emoji: "🔴", label: "Do not disturb" };
    case "offline":
      return { emoji: "⚫", label: "Offline" };
  }
}

/** Order preserved from API — keyed by server-assigned lane only. */
function splitIntoLanes(members: DiscordMemberApiRow[]): {
  heads: DiscordMemberApiRow[];
  membersMapped: DiscordMemberApiRow[];
  membersOther: DiscordMemberApiRow[];
} {
  return {
    heads: members.filter((m) => m.rosterSection === "head"),
    membersMapped: members.filter((m) => m.rosterSection === "member_mapped"),
    membersOther: members.filter((m) => m.rosterSection === "member_other"),
  };
}

function RosterStatsAside({ stats }: { stats: DiscordRosterStats }) {
  const items: { label: string; hint?: string; value: number }[] = [
    { label: "WWM Members", hint: 'Role "WWM Member"', value: stats.discordWwmMemberRoleCount },
    { label: "WWM Heads", hint: 'Discord role "WWM Head"', value: stats.discordWwmHeadRoleCount },
    {
      label: "With IGN",
      hint: "Roster mapping",
      value: stats.rosterMappedIgnCount,
    },
    { label: "No IGN", hint: "On roster, unmapped", value: stats.rosterUnmappedIgnCount },
  ];

  return (
    <aside className="rounded-2xl border border-gold/25 bg-card/90 px-4 py-3 shadow-card backdrop-blur-sm md:px-4 md:py-3">
      <h2 className="font-display text-sm font-semibold tracking-wide text-gold-bright">
        Guild snapshot
      </h2>
      <p
        className="mt-0.5 leading-snug text-[10px] text-mist/90 line-clamp-2"
        title="Updates ~15s. Roster list is prefetched in the background on other pages."
      >
        Refresh ~15s · roster prefetched while you browse.
      </p>
      <ul className="mt-3 grid grid-cols-2 gap-x-2 gap-y-2.5">
        {items.map((it) => (
          <li
            key={it.label}
            className="rounded-lg border border-gold/10 bg-void/30 px-2 py-1.5"
            title={`${it.label}: ${it.hint ?? ""}`}
          >
            <p className="text-[9px] font-medium uppercase tracking-wider text-gold-dim/95">
              {it.label}
            </p>
            <p className="mt-0.5 tabular-nums text-lg font-semibold leading-none text-foreground md:text-xl">
              {it.value.toLocaleString()}
            </p>
          </li>
        ))}
      </ul>
    </aside>
  );
}

function MemberSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-gold/20 bg-card/60 p-5 md:p-6">
      <div className="flex gap-4">
        <div className="size-14 shrink-0 rounded-full bg-mist/20" />
        <div className="min-w-0 flex-1 space-y-3">
          <div className="h-5 w-[55%] rounded bg-mist/20" />
          <div className="h-4 w-[40%] rounded bg-mist/15" />
          <div className="flex gap-2">
            <div className="h-6 w-20 rounded-full bg-mist/15" />
          </div>
        </div>
      </div>
    </div>
  );
}

function MemberCard({
  member,
  isHead,
  index,
}: {
  member: DiscordMemberApiRow;
  isHead: boolean;
  index: number;
}) {
  const statusMeta = statusDisplay(member.status);

  const baseCard =
    "relative overflow-hidden rounded-2xl border bg-card/90 p-5 shadow-card backdrop-blur-sm md:p-6 transition-shadow";

  const headStyle = isHead
    ? "border-gold-bright/50 ring-1 ring-gold-bright/30"
    : "border-gold/25";

  const inGameStyle =
    member.status === "in-game"
      ? "ring-2 ring-emerald-400/65 shadow-[0_0_28px_rgba(52,211,153,0.35)]"
      : "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38, delay: Math.min(index * 0.02, 0.35) }}
      className={`${baseCard} ${headStyle} ${inGameStyle}`}
    >
      {isHead && (
        <div
          className="pointer-events-none absolute right-4 top-4 text-xl opacity-90"
          title="Shown in Leadership & Heads (site leadership roster and/or Discord WWM Head)."
          aria-hidden
        >
          👑
        </div>
      )}

      <div className="flex gap-4">
        <img
          src={member.avatar || "https://cdn.discordapp.com/embed/avatars/0.png"}
          alt=""
          className="size-14 shrink-0 rounded-full border border-gold/20 object-cover"
          width={56}
          height={56}
          loading="lazy"
          referrerPolicy="no-referrer"
        />

        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2 gap-y-1 pr-10">
            <p className="truncate font-medium text-foreground">{member.discordName}</p>

            <span className="shrink-0 text-base" title={statusMeta.label}>
              {statusMeta.emoji}
            </span>

            {member.status === "in-game" && (
              <span className="inline-flex shrink-0 items-center rounded-full border border-emerald-400/50 bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-200">
                In Game
              </span>
            )}
          </div>

          {member.inGameName ? (
            <p className="text-sm text-mist">
              <abbr title="In-game name" className="text-gold-dim no-underline">
                IGN
              </abbr>
              {": "}
              <span className="text-foreground">{member.inGameName}</span>
            </p>
          ) : (
            <p className="text-sm text-mist italic">No IGN on file</p>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-gold-dim">
            <span className="text-mist capitalize">{member.status}</span>

            {member.activity && (
              <span className="truncate max-w-[16rem]" title={member.activity}>
                {member.activity}
              </span>
            )}

            {member.voiceChannel && (
              <span className="inline-flex items-center gap-1 text-gold/90">
                <span aria-hidden>🎤</span>
                <span className="truncate max-w-[12rem]" title={member.voiceChannel}>
                  {member.voiceChannel}
                </span>
              </span>
            )}
          </div>

          {member.lastActive && member.status === "offline" && (
            <p className="text-xs text-mist/90">{member.lastActive}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function DiscordMembersRoster() {
  const [payload, setPayload] = useState<DiscordRosterApiPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useLayoutEffect(() => {
    const cached = readDiscordMembersRosterCache();
    if (cached) {
      setPayload(cached);
      setLoading(false);
    }
  }, []);

  const load = useCallback(async () => {
    try {
      setError(null);

      const result = await fetchDiscordMembersRosterDeduplicated();

      if (!result.ok) {
        const body = result.body as {
          error?: string;
          hint?: string;
          details?: string;
          code?: number | string;
        };
        const parts = [
          typeof body.error === "string"
            ? body.error
            : result.status
              ? `HTTP ${result.status}`
              : "Request failed",
          typeof body.hint === "string" ? body.hint : null,
          typeof body.details === "string"
            ? `Technical: ${body.details}${body.code !== undefined ? ` (code ${String(body.code)})` : ""}`
            : body.code !== undefined
              ? `Technical: code ${String(body.code)}`
              : null,
        ].filter(Boolean) as string[];
        setError(parts.join("\n\n"));
        return;
      }

      const data = result.payload;
      const members = Array.isArray(data.members) ? data.members : [];

      const statsPayload =
        data.stats && typeof data.stats.discordWwmMemberRoleCount === "number"
          ? data.stats
          : {
              discordWwmMemberRoleCount: 0,
              discordWwmHeadRoleCount: 0,
              rosterMappedIgnCount: 0,
              rosterUnmappedIgnCount: 0,
            };

      setPayload({
        members,
        stats: statsPayload as DiscordRosterStats,
      });
    } catch {
      setError("Network error while refreshing roster.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), POLL_MS);
    return () => window.clearInterval(id);
  }, [load]);

  const rows = payload?.members;
  const stats = payload?.stats;

  const sections = useMemo(() => splitIntoLanes(rows ?? []), [rows]);

  const showSkeleton = loading && rows == null;

  const totalListed =
    sections.heads.length + sections.membersMapped.length + sections.membersOther.length;

  return (
    <div className="space-y-10">
      {!showSkeleton && error && (
        <p className="whitespace-pre-wrap break-words rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          {error}
          <button
            type="button"
            onClick={() => void load()}
            className="ml-3 underline decoration-amber-200/70 underline-offset-2 hover:text-white"
          >
            Retry now
          </button>
        </p>
      )}

      <p className="text-center text-xs text-gold-dim">
        Discord × site leadership roster. Members & Others lanes auto-sort by WWM presence each
        refresh; Leadership & Heads order is fixed server-side.
      </p>

      {showSkeleton ? (
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-4 xl:gap-5">
          <div className="min-w-0 flex-1">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <MemberSkeleton key={i} />
              ))}
            </div>
          </div>
          <div className="mx-auto w-full max-w-[11.5rem] shrink-0 lg:mx-0">
            <div className="h-40 animate-pulse rounded-2xl border border-gold/20 bg-card/40" />
          </div>
        </div>
      ) : totalListed === 0 ? (
        error ? null : (
          <p className="rounded-xl border border-gold/20 bg-card/50 px-4 py-6 text-center text-mist">
            No eligible members matched the filters (requires WWM Head or WWM Member role).
          </p>
        )
      ) : (
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-4 xl:gap-5">
          <div className="order-2 min-w-0 flex-1 space-y-10 lg:order-1">
            {sections.heads.length > 0 && (
              <section className="space-y-3">
                <h2 className="font-display text-xl text-gold-bright md:text-2xl">
                  👑 Leadership & Heads
                </h2>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3">
                  {sections.heads.map((m, i) => (
                    <MemberCard key={m.id} member={m} isHead index={i} />
                  ))}
                </div>
              </section>
            )}

            {sections.membersMapped.length > 0 && (
              <section className="space-y-3">
                <h2 className="font-display text-xl text-gold-bright md:text-2xl">
                  ⚔️ Members (presence order)
                </h2>
                <p className="text-xs text-mist">
                  In-game (Where Winds Meet) first, then online → idle → DND/offline — resorted every
                  refresh.
                </p>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3">
                  {sections.membersMapped.map((m, i) => (
                    <MemberCard key={m.id} member={m} isHead={false} index={i} />
                  ))}
                </div>
              </section>
            )}

            {sections.membersOther.length > 0 && (
              <section className="space-y-3">
                <h2 className="font-display text-xl text-gold-bright md:text-2xl">
                  📜 Other Members
                </h2>
                <p className="text-xs text-mist">
                  Same presence order as Members lane — easiest to spot who&apos;s actively in WWM.
                </p>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3">
                  {sections.membersOther.map((m, i) => (
                    <MemberCard key={m.id} member={m} isHead={false} index={i} />
                  ))}
                </div>
              </section>
            )}
          </div>

          {stats && (
            <div className="order-1 shrink-0 max-lg:mx-auto max-lg:w-full max-lg:max-w-sm lg:sticky lg:top-[5.25rem] lg:order-2 lg:w-[11.75rem] lg:pt-[2.875rem] xl:w-[12.25rem]">
              <RosterStatsAside stats={stats} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
