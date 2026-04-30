import type { Metadata } from "next";
import Link from "next/link";
import { WuxiaShell } from "@/components/layout";
import { Card } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/env";
import { LocalDateTime, PublicCountdown, TimeAutoRefresh } from "@/components/community";
import { isExpired, isNotYetOpen } from "@/lib/quiz-times";
import { statusLabel } from "@/lib/quiz-meta";

export const metadata: Metadata = {
  title: "Quizzes",
  description:
    "HighHeavenSect guild quizzes for Where Winds Meet (WWM): open times, join codes, and countdowns in your time zone. SEA English community fun.",
  alternates: { canonical: "/quizzes" },
};

export const dynamic = "force-dynamic";

type Quiz = {
  id: string;
  title: string;
  quiz_type: "trial" | "tournament";
  time_limit_seconds: number;
  join_code: string;
  scheduled_at: string | null;
  opens_at: string | null;
  closes_at: string | null;
  status: string;
};

type AttemptRow = { in_game_name: string; score: number; max_score: number };

export default async function PublicQuizzesPage() {
  let rows: Quiz[] = [];
  const winners: Record<string, AttemptRow | null> = {};
  const trialTopThree: Record<string, AttemptRow[]> = {};

  if (hasSupabase()) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("quizzes")
      .select(
        "id, title, quiz_type, time_limit_seconds, join_code, scheduled_at, opens_at, closes_at, status",
      )
      .neq("status", "draft")
      .neq("status", "simulation")
      .order("created_at", { ascending: false });
    rows = (data ?? []) as Quiz[];
    for (const q of rows) {
      if (q.quiz_type === "trial") {
        const { data: top3 } = await supabase
          .from("quiz_attempts")
          .select("in_game_name, score, max_score")
          .eq("quiz_id", q.id)
          .order("score", { ascending: false })
          .order("created_at", { ascending: true })
          .limit(3);
        trialTopThree[q.id] = (top3 ?? []) as AttemptRow[];
        winners[q.id] = trialTopThree[q.id]?.[0] ?? null;
      } else {
        const { data: best } = await supabase
          .from("quiz_attempts")
          .select("in_game_name, score, max_score")
          .eq("quiz_id", q.id)
          .order("score", { ascending: false })
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();
        winners[q.id] = best ? (best as AttemptRow) : null;
      }
    }
  }

  return (
    <WuxiaShell>
      <div className="mb-8 text-center">
        <h1 className="font-display text-3xl text-gold-bright">Quizzes</h1>
        <p className="mt-2 mx-auto max-w-2xl text-mist">
          Times use your device time zone. Sect Trials are open between their start time and room
          close time; live Heavenly Tournaments sync everyone in lockstep—see each card for what
          applies. One attempt per browser for each Sect Trial.
        </p>
      </div>
      {!hasSupabase() && (
        <Card>
          <p className="text-mist">Connect Supabase in .env.local to list quizzes.</p>
        </Card>
      )}
      {hasSupabase() && rows.length === 0 && (
        <Card>
          <p className="text-mist">No public quizzes yet. Drafts stay hidden. Officers publish from the admin area.</p>
        </Card>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {rows.map((q, i) => {
          const openAt = q.opens_at || q.scheduled_at;
          const isLive = q.status === "live";
          const isScheduled = q.status === "scheduled";
          const inScheduledWindow =
            !!openAt &&
            !isNotYetOpen(openAt) &&
            (q.closes_at ? !isExpired(q.closes_at) : true);
          const liveWindowOpen = q.closes_at ? !isExpired(q.closes_at) : true;
          const canEnter =
            q.status !== "ended" &&
            ((isScheduled && inScheduledWindow) || (isLive && liveWindowOpen));
          const hasStarted = !!openAt && !isNotYetOpen(openAt);
          const done =
            q.status === "ended" ||
            ((isLive || isScheduled) && q.closes_at && isExpired(q.closes_at) && (!openAt || hasStarted));
          return (
            <Card key={q.id} delay={0.04 * i}>
              <h2 className="font-display text-lg text-gold-bright">{q.title}</h2>
              <p className="mt-1 text-sm text-mist">
                {q.quiz_type === "tournament" ? "Heavenly Tournament" : "Sect Trial"} · {q.time_limit_seconds}s per question, status: {q.status} ({statusLabel(q.status)})
              </p>
              {openAt && (
                <p className="text-xs text-mist">
                  Opens (your time): <LocalDateTime iso={openAt} />
                </p>
              )}
              {q.closes_at && q.quiz_type !== "tournament" && (
                <p className="text-xs text-mist">
                  Room closes (your time): <LocalDateTime iso={q.closes_at} />
                </p>
              )}
              {openAt && (q.status === "scheduled" || q.status === "live") && isNotYetOpen(openAt) && (
                <div className="mt-2">
                  <PublicCountdown targetIso={openAt} label="Starts in" />
                </div>
              )}
              <TimeAutoRefresh targetIso={openAt} />
              <TimeAutoRefresh targetIso={q.closes_at} />
              <p className="mt-2 font-mono text-sm text-gold">Code: {q.join_code}</p>
              {canEnter && (
                <Link
                  href={`/quiz/${q.join_code}`}
                  className="mt-3 inline-block rounded-lg border border-gold/40 px-3 py-1.5 text-sm text-gold-bright transition hover:bg-white/5"
                >
                  Open quiz room
                </Link>
              )}
              {!canEnter && !done && !openAt && q.status !== "ended" && (
                <p className="mt-2 text-sm text-mist">Set a start time in admin, then this link unlocks in time.</p>
              )}
              {isScheduled && openAt && isNotYetOpen(openAt) && (
                <p className="mt-2 text-sm text-mist">
                  Quiz is scheduled. It will open automatically at the start time.
                </p>
              )}
              {done && (
                <div className="mt-3 text-sm text-mist">
                  <p>Quiz closed.</p>
                  {q.quiz_type === "trial" && (trialTopThree[q.id]?.length ?? 0) > 0 && (
                    <div className="mt-2 text-foreground">
                      <p className="font-medium text-gold-bright">Top 3</p>
                      <ol className="mt-1 list-decimal pl-5">
                        {(trialTopThree[q.id] ?? []).map((r, idx) => (
                          <li key={`${idx}-${r.in_game_name}-${r.score}`}>
                            {r.in_game_name} — {r.score}/{r.max_score}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                  {q.quiz_type !== "trial" && winners[q.id] && (
                    <p className="mt-1 text-foreground">
                      Top score: {winners[q.id]!.in_game_name} (
                      {winners[q.id]!.score} / {winners[q.id]!.max_score})
                    </p>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </WuxiaShell>
  );
}
