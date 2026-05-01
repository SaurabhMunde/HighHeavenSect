"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Card } from "@/components/ui/card";
import {
  GUILD_WAR_DUTY_KEYS,
  GUILD_WAR_DUTY_LABEL,
  GUILD_WAR_MAX_SIGNUPS,
  dutyIcon,
  parseEmbeddedDutySignup,
  type GuildWarDutyKey,
} from "@/lib/guild-war";
import { formatUtcForIstBadge } from "@/lib/guild-war/ist";
import { createClient } from "@/lib/supabase/client";

export type WarEventPublic = {
  id: string;
  title: string;
  scheduled_start_at: string;
  purge_at: string;
  signup_template_default: number;
};

export type SignupPublic = {
  id: string;
  participant_name: string;
  duty_role: GuildWarDutyKey;
  created_at: string;
};

export type TeamPublic = {
  id: string;
  label: string;
  sort_order: number;
  members: { signupId: string; name: string; duty: GuildWarDutyKey }[];
};

type Props = {
  wars: WarEventPublic[];
  initialWarId: string;
  initialSignups: SignupPublic[];
  initialTeams: TeamPublic[];
};

export function PublicGuildWarView({
  wars,
  initialWarId,
  initialSignups,
  initialTeams,
}: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [warId, setWarId] = useState(initialWarId);
  const [signups, setSignups] = useState(initialSignups);
  const [teams, setTeams] = useState(initialTeams);
  const [name, setName] = useState("");
  const [duty, setDuty] = useState<GuildWarDutyKey>("dps");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const activeWar = wars.find((w) => w.id === warId) ?? null;

  const refresh = useCallback(async () => {
    if (!warId) return;
    const [{ data: s }, { data: trows }] = await Promise.all([
      supabase
        .from("guild_war_signups")
        .select("id, participant_name, duty_role, created_at")
        .eq("war_event_id", warId)
        .order("created_at", { ascending: true }),
      supabase.from("guild_war_teams").select("id, label, sort_order").eq("war_event_id", warId).order("sort_order"),
    ]);

    const nextSignups = (s ?? []) as SignupPublic[];
    setSignups(nextSignups);

    const teamIds = (trows ?? []).map((r) => r.id as string);
    let nextTeams: TeamPublic[] = [];
    if (teamIds.length) {
      const { data: assigns } = await supabase
        .from("guild_war_team_assignments")
        .select("team_id, signup_id, guild_war_signups(id, participant_name, duty_role)")
        .in("team_id", teamIds);

      const byTeam = new Map<string, TeamPublic["members"]>();
      for (const tid of teamIds) byTeam.set(tid, []);

      for (const row of assigns ?? []) {
        const tid = row.team_id as string;
        const su = parseEmbeddedDutySignup(
          (row as { guild_war_signups?: unknown }).guild_war_signups,
        );
        if (!su) continue;
        const list = byTeam.get(tid);
        if (list)
          list.push({
            signupId: su.id,
            name: su.participant_name,
            duty: su.duty_role,
          });
      }

      nextTeams = (trows ?? []).map((t) => ({
        id: t.id as string,
        label: t.label as string,
        sort_order: t.sort_order as number,
        members: byTeam.get(t.id as string) ?? [],
      }));
    }

    setTeams(nextTeams);
  }, [supabase, warId]);

  useEffect(() => {
    void refresh();
  }, [warId, refresh]);

  useEffect(() => {
    const id = window.setInterval(() => {
      void refresh();
    }, 5000);
    return () => window.clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    if (!warId) return;
    const ch = supabase
      .channel(`public-gw:${warId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "guild_war_signups", filter: `war_event_id=eq.${warId}` },
        () => void refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "guild_war_teams", filter: `war_event_id=eq.${warId}` },
        () => void refresh(),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "guild_war_team_assignments" }, () =>
        void refresh(),
      );
    ch.subscribe((status) => {
      if (status === "CHANNEL_ERROR") {
        console.warn("[guild-war/public] Realtime off or misconfigured; polling still refreshes every 5s.");
      }
    });
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [warId, supabase, refresh]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const byDuty = useMemo(() => {
    const buckets: Record<GuildWarDutyKey, SignupPublic[]> = {
      dps: [],
      tank: [],
      heal: [],
      flex: [],
    };
    for (const s of signups) {
      if (buckets[s.duty_role]) buckets[s.duty_role].push(s);
    }
    return buckets;
  }, [signups]);

  async function submitSignup(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!warId || !activeWar) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setMsg("Enter the IGN or roster name officers expect.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/guild-war/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          warEventId: warId,
          participantName: trimmed,
          dutyRole: duty,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Signup failed");
      setName("");
      setOpen(false);
      await refresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Could not signup");
    } finally {
      setBusy(false);
    }
  }

  if (!activeWar || wars.length === 0) {
    return (
      <Card className="border-gold/30 bg-[#17202b]/80 p-8 text-center text-mist">
        <p>No open guild wars right now. Check back after officers schedule one.</p>
      </Card>
    );
  }

  const filled = signups.length;
  const spotsLeft = Math.max(GUILD_WAR_MAX_SIGNUPS - filled, 0);

  return (
    <div className="relative">
      <div className="pointer-events-none absolute -left-20 top-0 h-72 w-72 rounded-full bg-rose-900/24 blur-[100px]" />
      <div className="pointer-events-none absolute -right-16 bottom-0 h-72 w-72 rounded-full bg-amber-900/26 blur-[100px]" />

      <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="space-y-5">
          {wars.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {wars.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => {
                    setWarId(w.id);
                    window.history.replaceState(null, "", `/guild-war?war=${w.id}`);
                  }}
                  className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition ${
                    warId === w.id
                      ? "border-gold/70 bg-[#fce8fb]/22 text-gold-bright shadow-[0_0_22px_rgba(212,169,226,0.25)]"
                      : "border-gold/28 text-mist hover:border-gold/50 hover:text-foreground"
                  }`}
                >
                  {w.title}
                </button>
              ))}
            </div>
          )}

          <motion.div layout className="overflow-hidden rounded-2xl border border-gold/40 bg-gradient-to-br from-[#1c2633]/94 via-[#18212d]/93 to-[#141c27]/93 p-6 shadow-[0_18px_50px_rgba(5,12,22,0.55)] backdrop-blur-sm">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gold/20 pb-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-gold/50">
                  Guild war signup
                </p>
                <h2 className="mt-2 font-display text-2xl text-gold-bright">{activeWar.title}</h2>
                <p className="mt-1 flex flex-wrap gap-2 text-sm text-gold">
                  <span>{formatUtcForIstBadge(activeWar.scheduled_start_at)} IST</span>
                  <span className="text-mist">
                    Template <span className="text-gold-bright">{activeWar.signup_template_default}</span>
                  </span>
                </p>
              </div>
              <div className="rounded-xl border border-gold/35 bg-black/35 px-4 py-3 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gold/45">Slots</p>
                <p className="font-display text-3xl tabular-nums text-gold-bright">
                  {filled}
                  <span className="text-lg text-gold">/{GUILD_WAR_MAX_SIGNUPS}</span>
                </p>
                {spotsLeft === 0 ? (
                  <p className="text-xs text-red-300/95">War roster full</p>
                ) : (
                  <p className="text-xs text-mist">{spotsLeft} open</p>
                )}
              </div>
            </div>

            <div
              role="note"
              className="mt-4 rounded-xl border border-amber-400/50 bg-[#2a1810]/75 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,220,180,0.08)] backdrop-blur-sm"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-amber-200/95">Important</p>
              <p className="mt-2 text-sm leading-relaxed text-amber-50/93">
                Signing up here does not replace the game: after you reserve a spot on this page,{' '}
                <strong className="font-semibold text-amber-100">sign up for the war in-game as well</strong>.{' '}
                Be online and{' '}
                <strong className="font-semibold text-amber-100">available at least five minutes before</strong> the
                scheduled start, and{' '}
                <strong className="font-semibold text-amber-100">join the guild Discord voice channel</strong> so the raid
                can coordinate.
              </p>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(true)}
                  disabled={spotsLeft === 0}
                  className="flex-1 min-w-[8rem] rounded-xl border border-gold/55 bg-[radial-gradient(ellipse_at_80%_-20%,rgba(255,220,237,0.5),transparent)] px-5 py-3 font-display text-gold-bright shadow-[0_14px_30px_rgba(40,26,62,0.45)] transition hover:border-gold/80 hover:brightness-105 disabled:pointer-events-none disabled:opacity-40"
                >
                  Sign up · pick role
                </button>
              </div>

              <p className="text-xs leading-relaxed text-mist">
                Roles open for duty: DPS, TANK, Heal, and Can Fill any. First {GUILD_WAR_MAX_SIGNUPS} signups seal the slate.
              </p>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {GUILD_WAR_DUTY_KEYS.map((key) => (
                <DutyColumnPublic key={key} duty={key} signups={byDuty[key]} count={byDuty[key].length} />
              ))}
            </div>
          </motion.div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-gold/35 bg-[#141c26]/88 p-4 shadow-inner shadow-black/55 backdrop-blur">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-gold/50">Formation roster</p>
            <p className="mt-2 text-xs text-mist">
              Elders assemble battle lines off scroll; disciple placements shimmer here once bound.
            </p>
          </div>
          <div className="space-y-3">
            {teams.length === 0 && (
              <Card className="border-gold/20 bg-black/38 p-4 text-xs text-mist">
                No formations posted yet, Elders will bind disciples once the hall fills.
              </Card>
            )}
            {teams.map((t, i) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.04 * i }}
                className="rounded-2xl border border-gold/28 bg-gradient-to-br from-[#223044]/94 to-[#151d28]/93 p-4 shadow-[inset_0_1px_0_rgba(255,246,237,0.08)] backdrop-blur"
              >
                <div className="flex items-center justify-between gap-2 border-b border-gold/15 pb-2">
                  <p className="font-display text-lg text-gold-bright">{t.label}</p>
                  <span className="rounded-full bg-gold/14 px-2 py-0.5 text-[10px] uppercase tracking-wide text-gold">
                    Squad
                  </span>
                </div>
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {t.members.length === 0 && (
                    <li className="text-xs italic text-gold/40">Awaiting disciples for this formation</li>
                  )}
                  {t.members.map((m) => (
                    <li
                      key={m.signupId}
                      className="rounded-lg border border-gold/20 bg-black/42 px-2 py-1 text-xs text-gold"
                    >
                      <span aria-hidden>{dutyIcon(m.duty)}</span> {m.name}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </aside>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] isolate flex items-end justify-center p-4 sm:items-center"
            role="dialog"
            aria-modal="true"
            aria-labelledby="gw-signup-title"
          >
            {/* Solid scrim: blocks page content bleeding through */}
            <button
              type="button"
              className="absolute inset-0 cursor-default bg-[#030508]/95 backdrop-blur-md"
              aria-label="Close signup"
              onClick={() => !busy && setOpen(false)}
            />
            <motion.form
              onSubmit={submitSignup}
              initial={{ y: 28, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 24, opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              className="relative z-10 mx-auto w-full max-w-md overflow-hidden rounded-3xl border-2 border-gold/50 bg-[#0f151c] p-7 shadow-[0_0_0_1px_rgba(0,0,0,0.4),0_44px_100px_rgba(0,0,0,0.85)]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Opaque inner panel strip so text never mixes with BG */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#161f2c] via-[#0f151c] to-[#0c1016]" aria-hidden />
              <div className="relative">
                <p
                  id="gw-signup-title"
                  className="font-display text-xl tracking-tight text-[#fdeff7]"
                >
                  Step into the roster
                </p>

                <label className="mt-5 block text-[11px] font-semibold uppercase tracking-[0.2em] text-[#cba6d9]">
                  Your name · IGN / roster alias
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-gold/40 bg-[#080b10] px-3 py-3.5 text-[15px] text-[#f1f6ff] caret-gold placeholder:text-[#5c6c82] outline-none ring-2 ring-transparent transition focus:border-gold/65 focus:ring-gold/25"
                  maxLength={64}
                  placeholder="Exactly how we should hail you"
                  autoComplete="off"
                  autoFocus
                />

                <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#cba6d9]">
                  Battle role
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2.5">
                  {GUILD_WAR_DUTY_KEYS.map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setDuty(k)}
                      className={`rounded-xl border-2 px-3 py-3.5 text-left text-[13px] font-semibold transition ${
                        duty === k
                          ? "border-gold bg-[#2d2238] text-[#fdeff7] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]"
                          : "border-[#3a4658] bg-[#141922] text-[#dbe7ff] hover:border-gold/40 hover:bg-[#1a2230]"
                      }`}
                    >
                      <span className="mr-1.5 inline-block align-middle">{dutyIcon(k)}</span>
                      {GUILD_WAR_DUTY_LABEL[k]}
                    </button>
                  ))}
                </div>

                {msg && (
                  <p className="mt-4 rounded-lg border border-red-400/35 bg-[#301018] px-3 py-2 text-sm text-[#fecaca]">
                    {msg}
                  </p>
                )}

                <div className="mt-9 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="flex-1 rounded-xl border-2 border-[#4b556d] bg-[#1b2330] py-3.5 text-xs font-semibold uppercase tracking-wider text-[#e8edf7] hover:border-[#6b758c] hover:bg-[#232d3f]"
                    disabled={busy}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={busy || spotsLeft === 0}
                    className="flex-[1.2] rounded-xl border border-transparent bg-[linear-gradient(120deg,#e8bcf5,#d07fd6)] px-4 py-3.5 text-xs font-bold uppercase tracking-[0.18em] text-[#121018] shadow-lg hover:brightness-105 disabled:pointer-events-none disabled:opacity-45"
                  >
                    {busy ? "Locking seat…" : "Commit"}
                  </button>
                </div>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DutyColumnPublic({
  duty,
  signups,
  count,
}: {
  duty: GuildWarDutyKey;
  signups: SignupPublic[];
  count: number;
}) {
  return (
    <div className="rounded-2xl border border-white/15 bg-black/43 p-4 shadow-inner backdrop-blur">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-gold-bright">
          <span aria-hidden>{dutyIcon(duty)} </span>
          {GUILD_WAR_DUTY_LABEL[duty]}
          <span className="mt-2 block text-[11px] font-normal text-gold/45">
            {count}/{GUILD_WAR_MAX_SIGNUPS}
          </span>
        </p>
      </div>
      <ul className="max-h-[240px] space-y-1.5 overflow-y-auto pr-1 text-sm">
        {signups.map((s) => (
          <li
            key={s.id}
            className="rounded-lg bg-white/[0.05] px-2 py-1.5 font-medium tracking-tight text-foreground"
          >
            {s.participant_name}
          </li>
        ))}
      </ul>
      {signups.length === 0 && <p className="text-[11px] italic text-gold/35">No names yet · need bodies</p>}
    </div>
  );
}
