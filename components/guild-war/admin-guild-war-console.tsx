"use client";

import {
  type CollisionDetection,
  closestCenter,
  DndContext,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
  type DropAnimation,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { snapCenterToCursor } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { GuildWarDutyKey } from "@/lib/guild-war";
import { GUILD_WAR_DUTY_LABEL, dutyIcon } from "@/lib/guild-war";
import { formatUtcForIstBadge, istDateAndTimeToUtcIso } from "@/lib/guild-war/ist";
import { createClient } from "@/lib/supabase/client";

type WarRow = {
  id: string;
  title: string;
  scheduled_start_at: string;
  purge_at: string;
};

type SignupRow = {
  id: string;
  participant_name: string;
  duty_role: GuildWarDutyKey;
};

type TeamDraft = {
  draftId: string;
  dbId?: string;
  label: string;
  signupIds: string[];
};

/** Outer-hall droppable id (distinct from disciple UUID ids). */
const POOL_ID = "__pool__";

function sigDragId(signupId: string) {
  return `sig:${signupId}`;
}

function formationDropId(draftId: string) {
  return `frm:${draftId}`;
}

function stripSigPrefix(id: string | number): string | null {
  const s = String(id);
  return s.startsWith("sig:") ? s.slice(4) : null;
}

/**
 * Prefer what the pointer is actually over; if the overlay misses (scroll/layout),
 * use rectangle overlap, then closest-center — avoids drop targets snapping to wrong columns.
 */
const formationCollisionDetection: CollisionDetection = (args) => {
  const pointer = pointerWithin(args);
  if (pointer.length) return pointer;

  const rect = rectIntersection(args);
  if (rect.length > 0) return rect;

  return closestCenter(args);
};

const formationDropAnimation: DropAnimation = {
  duration: 220,
  easing: "cubic-bezier(0.25, 1, 0.5, 1)",
};

/** Shared inner markup so DragOverlay pixels match draggable chips — mismatched heights cause pointer/preview drift. */
function SignupChipFace({ signup }: { signup: SignupRow }) {
  return (
    <>
      <span className="mr-1">{dutyIcon(signup.duty_role)}</span>
      <span>{signup.participant_name}</span>
      <span className="mt-0.5 block text-[10px] font-medium uppercase tracking-wide text-[#7dd3b0]/85">
        {GUILD_WAR_DUTY_LABEL[signup.duty_role]}
      </span>
    </>
  );
}

const draggableChipClasses =
  "touch-manipulation cursor-grab select-none rounded-lg border-2 border-[#4a9269]/72 bg-[#0c1613] px-2.5 py-2 text-xs font-semibold text-[#dcfced] shadow-sm hover:border-[#6dcf9c]/92 active:cursor-grabbing";

function DraggableSignup({ signup }: { signup: SignupRow }) {
  const dragId = sigDragId(signup.id);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: dragId,
    data: { type: "signup", signupId: signup.id },
  });

  const style: CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0 : 1,
    touchAction: "none",
    /** Layout slot stays; invisible — DragOverlay follows the cursor with snapCenterToCursor */
    pointerEvents: isDragging ? "none" : "auto",
    transition: "opacity 80ms ease",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={draggableChipClasses}
    >
      <SignupChipFace signup={signup} />
    </div>
  );
}

function DroppableFormationPane({
  id,
  title,
  subtitle,
  children,
}: {
  id: string;
  title: React.ReactNode;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: {
      type: id === POOL_ID ? "outerHall" : "formation",
      droppableId: id,
    },
  });
  return (
    <div
      className={`min-h-[220px] rounded-2xl border-2 p-4 transition-colors ${
        isOver
          ? "border-[#eab308]/90 bg-[#1f2f28]/94 ring-2 ring-[#eab308]/35"
          : "border-emerald-500/35 bg-black/76"
      }`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-emerald-500/30 pb-2">
        {/* Header stays outside droppable node so drops target the disciple canvas, not controls */}
        {/* div: title may be complex (inputs); blocks cannot live in <p> */}
        <div className="min-w-0 flex-1 font-display text-[1.08rem] text-[#d7faeb]">{title}</div>
        {subtitle && (
          <span className="shrink-0 rounded-md bg-black/53 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-200">
            {subtitle}
          </span>
        )}
      </div>
      <div
        ref={setNodeRef}
        className="mt-3 flex min-h-[136px] flex-wrap content-start gap-2 rounded-xl border border-dashed border-emerald-500/25 bg-black/40 p-2"
      >
        {children}
      </div>
    </div>
  );
}

export function AdminGuildWarConsole() {
  const supabase = useMemo(() => createClient(), []);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 10 } }),
  );

  const [wars, setWars] = useState<WarRow[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [signups, setSignups] = useState<SignupRow[]>([]);
  const [teams, setTeams] = useState<TeamDraft[]>([]);
  const [title, setTitle] = useState("");
  const [dateIst, setDateIst] = useState("");
  const [timeIst, setTimeIst] = useState("18:00");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [activeSig, setActiveSig] = useState<SignupRow | null>(null);

  /** Unsaved formation layout (drag/order/labels) vs Supabase snapshot — poll must not revert until Save. */
  const teamLayoutDirtyRef = useRef(false);

  const loadWars = useCallback(async () => {
    const { data } = await supabase.from("guild_war_events").select("*").order("scheduled_start_at", {
      ascending: false,
    });
    setWars((data ?? []) as WarRow[]);
  }, [supabase]);

  const hydrateWar = useCallback(
    async (warId: string, options?: { replaceTeamsFully?: boolean }) => {
      const replaceTeamsFully = options?.replaceTeamsFully ?? false;
      const [{ data: s }, { data: trows }] = await Promise.all([
        supabase.from("guild_war_signups").select("id, participant_name, duty_role").eq("war_event_id", warId),
        supabase.from("guild_war_teams").select("id, label, sort_order").eq("war_event_id", warId).order("sort_order"),
      ]);
      const nextSignups = (s ?? []) as SignupRow[];
      setSignups(nextSignups);

      const teamIds = (trows ?? []).map((r) => r.id as string);
      let nextTeams: TeamDraft[] = [];

      if (teamIds.length) {
        const { data: assigns } = await supabase
          .from("guild_war_team_assignments")
          .select("team_id, signup_id")
          .in("team_id", teamIds);

        const byTeam = new Map<string, string[]>();
        for (const tid of teamIds) byTeam.set(tid, []);

        for (const row of assigns ?? []) {
          const arr = byTeam.get(row.team_id as string);
          if (arr) arr.push(row.signup_id as string);
        }

        nextTeams = (trows ?? []).map((t) => ({
          draftId: t.id as string,
          dbId: t.id as string,
          label: t.label as string,
          signupIds: byTeam.get(t.id as string) ?? [],
        }));
      }

      setTeams((prev) => {
        if (replaceTeamsFully) {
          teamLayoutDirtyRef.current = false;
          return nextTeams;
        }

        const unsavedFormations = prev.filter((t) => !t.dbId);

        if (!teamLayoutDirtyRef.current) {
          return [...nextTeams, ...unsavedFormations];
        }

        const localBySavedId = new Map<string, { signupIds: string[]; label: string }>();
        for (const t of prev) {
          if (!t.dbId) continue;
          localBySavedId.set(t.dbId, { signupIds: [...t.signupIds], label: t.label });
        }

        const mergedSaved = nextTeams.map((row) => {
          const mine = localBySavedId.get(row.dbId as string);
          return mine === undefined ? row : { ...row, signupIds: mine.signupIds, label: mine.label };
        });

        return [...mergedSaved, ...unsavedFormations];
      });
    },
    [supabase],
  );

  useEffect(() => {
    void loadWars();
  }, [loadWars]);

  useEffect(() => {
    teamLayoutDirtyRef.current = false;
    if (!selected) {
      setTeams([]);
      return;
    }
    void hydrateWar(selected, { replaceTeamsFully: true });
  }, [selected, hydrateWar]);

  /** Live roster when this board is open — public signups & formation saves refresh here */
  useEffect(() => {
    if (!selected) return;

    const poll = window.setInterval(() => {
      void hydrateWar(selected);
    }, 4000);

    const ch = supabase
      .channel(`admin-gw:${selected}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "guild_war_signups", filter: `war_event_id=eq.${selected}` },
        () => void hydrateWar(selected),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "guild_war_teams", filter: `war_event_id=eq.${selected}` },
        () => void hydrateWar(selected),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "guild_war_team_assignments" }, () =>
        void hydrateWar(selected),
      );

    ch.subscribe((status) => {
      if (status === "CHANNEL_ERROR") {
        console.warn(
          "[guild-war/admin] realtime unavailable (enable tables in Supabase → Realtime). Polling still runs.",
        );
      }
    });

    return () => {
      window.clearInterval(poll);
      void supabase.removeChannel(ch);
    };
  }, [selected, supabase, hydrateWar]);

  const poolIds = useMemo(() => {
    const placed = new Set(teams.flatMap((t) => t.signupIds));
    return signups.filter((s) => !placed.has(s.id));
  }, [signups, teams]);

  async function handleCreateWar(e: React.FormEvent) {
    e.preventDefault();
    setNote(null);
    if (!title.trim()) {
      setNote("Give the war stack a chant-worthy title.");
      return;
    }
    if (!dateIst) {
      setNote("Pick a date (IST).");
      return;
    }

    let iso: string;
    try {
      iso = istDateAndTimeToUtcIso(dateIst, timeIst);
    } catch {
      setNote("Invalid date/time combination.");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/admin/guild-war", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ title: title.trim(), scheduledStartAt: iso }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Create failed");
      setNote(data.signupUrl ? `Signup link: ${data.signupUrl}` : "Guild war created.");
      setTitle("");
      await loadWars();
      setSelected(data.id ?? null);
    } catch (err) {
      setNote(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function deleteWar(id: string) {
    if (!confirm("Erase this signup board? Cascades roster and saved formations.")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/guild-war/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "delete failed");
      if (selected === id) setSelected(null);
      await loadWars();
    } catch (err) {
      setNote(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  function addBlankTeam() {
    teamLayoutDirtyRef.current = true;
    setTeams((prev) => [
      ...prev,
      {
        draftId: crypto.randomUUID(),
        label: `Formation ${prev.length + 1}`,
        signupIds: [],
      },
    ]);
  }

  function removeTeam(idx: number) {
    teamLayoutDirtyRef.current = true;
    setTeams((prev) => prev.filter((_, i) => i !== idx));
  }

  async function saveTeamsLayout() {
    if (!selected) return;
    setBusy(true);
    setNote(null);
    try {
      const payload = teams.map((t) => ({
        label: t.label,
        signupIds: t.signupIds,
      }));
      const res = await fetch(`/api/admin/guild-war/${selected}/teams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ teams: payload }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? `Save failed (${res.status})`);
      await hydrateWar(selected, { replaceTeamsFully: true });
      setNote("Formations saved. Public page updates within a few seconds.");
    } catch (err) {
      setNote(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  function resolveDropTarget(
    over: NonNullable<DragEndEvent["over"]>,
    teamState: TeamDraft[],
    roster: SignupRow[],
  ): typeof POOL_ID | { formationDraftId: string } {
    const oid = String(over.id);
    if (oid === POOL_ID) return POOL_ID;
    if (oid.startsWith("frm:")) return { formationDraftId: oid.slice("frm:".length) };

    let chipSignup = stripSigPrefix(oid);
    if (!chipSignup && roster.some((r) => r.id === oid)) chipSignup = oid;
    if (!chipSignup) return POOL_ID;

    const host = teamState.find((t) => t.signupIds.includes(chipSignup));
    return host ? { formationDraftId: host.draftId } : POOL_ID;
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveSig(null);
    const { active, over } = e;
    if (!over) return;

    const signupId = stripSigPrefix(active.id) ?? (signups.some((s) => s.id === String(active.id)) ? String(active.id) : null);
    if (!signupId) return;

    const dest = resolveDropTarget(over, teams, signups);
    const next = teams.map((t) => ({ ...t, signupIds: [...t.signupIds] }));

    for (const t of next) {
      t.signupIds = t.signupIds.filter((id) => id !== signupId);
    }

    if (dest === POOL_ID) {
      teamLayoutDirtyRef.current = true;
      setTeams(next);
      return;
    }

    const formationDraftId = "formationDraftId" in dest ? dest.formationDraftId : null;
    if (!formationDraftId) return;

    const formation = next.find((t) => t.draftId === formationDraftId);
    if (!formation) return;
    if (!formation.signupIds.includes(signupId)) formation.signupIds.push(signupId);
    teamLayoutDirtyRef.current = true;
    setTeams(next);
  }

  function handleDragStart(e: DragStartEvent) {
    const raw = stripSigPrefix(e.active.id) ?? (signups.some((s) => s.id === String(e.active.id)) ? String(e.active.id) : null);
    const signup = raw ? signups.find((s) => s.id === raw) ?? null : null;
    setActiveSig(signup);
  }

  return (
    <div className="space-y-8 text-[#273A49]">
      <section className="rounded-3xl border border-[#cfa256]/62 bg-[#fffef7]/93 p-5 shadow-xl">
        <h2 className="font-display text-xl text-[#935f20]">Launch · Guild war signup</h2>
        <p className="mt-1 text-sm text-[#4c5f6e]">
          Times are entered in IST (+05:30). On create you&apos;ll get a link to share; signups stay on site only.
        </p>
        <form onSubmit={handleCreateWar} className="mt-4 grid gap-3 md:grid-cols-5">
          <label className="md:col-span-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-[#96702b]">
              Banner title
            </span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Guild war Rank matches"
              maxLength={140}
              className="mt-1 w-full rounded-xl border border-[#d3b074]/73 bg-[#fffdf9]/93 px-3 py-2 text-[#27404d]"
            />
          </label>
          <label>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-[#96702b]">Day / IST</span>
            <input
              type="date"
              value={dateIst}
              onChange={(e) => setDateIst(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[#d3b074]/73 bg-[#fffdf9]/93 px-3 py-2 text-[#27404d]"
            />
          </label>
          <label>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-[#96702b]">Clock / IST</span>
            <input
              type="time"
              value={timeIst}
              onChange={(e) => setTimeIst(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[#d3b074]/73 bg-[#fffdf9]/93 px-3 py-2 text-[#27404d]"
            />
          </label>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-2xl border border-[#cfa256] bg-gradient-to-br from-[#ffe8fb] via-[#ffcfdd] to-[#fbd6ff] py-3 text-[11px] font-bold uppercase tracking-[0.3em] text-[#482f40] hover:brightness-105 disabled:opacity-40"
            >
              Broadcast
            </button>
          </div>
        </form>
      </section>

      {note && (
        <pre className="whitespace-pre-wrap rounded-2xl border border-[#c99c5f]/72 bg-black/73 p-4 text-xs text-emerald-200">
          {note}
        </pre>
      )}

      <section className="rounded-3xl border border-[#cfa256]/72 bg-black/71 p-4 text-emerald-100">
        <h3 className="font-display text-lg text-[#f6e5c9]">Open boards</h3>
        <ul className="mt-4 space-y-2 text-sm">
          {wars.length === 0 && <li className="text-emerald-200/73">Quiet war room — summon one above.</li>}
          {wars.map((w) => {
            const stillOpen = new Date(w.purge_at).getTime() > Date.now();
            return (
            <li
              key={w.id}
              className={`flex flex-wrap items-center gap-3 rounded-xl border px-4 py-2 ${
                selected === w.id ? "border-gold/73 bg-black/73" : "border-white/10 bg-transparent"
              }`}
            >
              <button
                type="button"
                onClick={() => setSelected(w.id)}
                className="flex-1 text-left font-medium text-emerald-100 hover:text-[#fcd77d]"
              >
                {w.title}
                <span className="block text-[11px] text-emerald-200/71">
                  {formatUtcForIstBadge(w.scheduled_start_at)} · purge {w.purge_at.slice(0, 16)} UTC
                </span>
                <span
                  className={`mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.25em] ${
                    stillOpen ? "text-emerald-300" : "text-amber-200"
                  }`}
                >
                  {stillOpen ? "Signups · live window" : "Cooldown · purge pending"}
                </span>
              </button>
              <button
                type="button"
                onClick={() => deleteWar(w.id)}
                className="rounded-lg border border-red-400/64 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-red-200 hover:bg-red-400/29"
              >
                Delete early
              </button>
            </li>
          );
          })}
        </ul>
      </section>

      {selected && (
        <DndContext
          sensors={sensors}
          collisionDetection={formationCollisionDetection}
          modifiers={[snapCenterToCursor]}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <section className="space-y-4 overflow-visible rounded-3xl border border-emerald-200/54 bg-black/71 p-4 shadow-[inset_0_1px_0_rgba(255,246,237,0.08)] backdrop-blur">
            <div className="flex flex-wrap gap-4">
              <button
                type="button"
                onClick={addBlankTeam}
                className="rounded-xl border border-gold/40 px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-gold hover:border-gold/70 hover:text-[#fcd77d]"
              >
                Add formation
              </button>
              <button
                type="button"
                onClick={() => saveTeamsLayout()}
                disabled={busy}
                className="rounded-xl border-2 border-emerald-900/60 bg-gradient-to-br from-emerald-300 via-teal-300 to-cyan-300 px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.28em] text-emerald-950 shadow-md hover:brightness-105 disabled:pointer-events-none disabled:opacity-45"
              >
                Save formations
              </button>
            </div>

            <p className="text-xs text-emerald-200/77">
              Drag disciples into a formation sheet. Outer hall holds everyone still unattached ({poolIds.length}{" "}
              disciples).
            </p>

            <DroppableFormationPane id={POOL_ID} title="Outer hall · unattached" subtitle="Drop here to release">
              {poolIds.map((s) => (
                <DraggableSignup key={s.id} signup={s} />
              ))}
            </DroppableFormationPane>

            <div className="grid gap-4 md:grid-cols-2">
              {teams.map((t, idx) => (
                <div key={t.draftId} className="space-y-2">
                  <DroppableFormationPane
                    id={formationDropId(t.draftId)}
                    title={
                      <div className="flex w-full items-center gap-2">
                        <input
                          value={t.label}
                          onChange={(e) => {
                            teamLayoutDirtyRef.current = true;
                            setTeams((prev) =>
                              prev.map((item, i) =>
                                i === idx ? { ...item, label: e.target.value } : item,
                              ),
                            );
                          }}
                          className="flex-1 rounded-lg border border-gold/30 bg-black/73 px-2 py-1 text-[0.95rem] font-display text-emerald-100"
                          onMouseDown={(e) => e.stopPropagation()}
                          onPointerDown={(e) => e.stopPropagation()}
                        />
                        <button
                          type="button"
                          onClick={() => removeTeam(idx)}
                          className="rounded-lg border border-red-400/64 px-2 py-1 text-[10px] uppercase text-red-100"
                          onMouseDown={(e) => e.stopPropagation()}
                        >
                          Disband
                        </button>
                      </div>
                    }
                    subtitle={`${t.signupIds.length} bound`}
                  >
                    {t.signupIds.map((sid) => {
                      const signup = signups.find((s) => s.id === sid);
                      if (!signup) return null;
                      return (
                        <DraggableSignup key={`frm-${t.draftId}-${signup.id}`} signup={signup} />
                      );
                    })}
                  </DroppableFormationPane>
                </div>
              ))}
            </div>

            <DragOverlay zIndex={500} dropAnimation={formationDropAnimation}>
              {activeSig ? (
                <div
                  className={`${draggableChipClasses} cursor-grabbing border-emerald-400/90 shadow-2xl ring-2 ring-emerald-500/35`}
                >
                  <SignupChipFace signup={activeSig} />
                </div>
              ) : null}
            </DragOverlay>
          </section>
        </DndContext>
      )}
    </div>
  );
}
