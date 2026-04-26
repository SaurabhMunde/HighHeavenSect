import Link from "next/link";
import { WuxiaShell } from "@/components/wuxia-shell";
import { Card } from "@/components/ui-card";
import { createClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/env";
import { PublicCountdown } from "@/components/public-countdown";
import { isExpired, isNotYetOpen } from "@/lib/quiz-times";

export const dynamic = "force-dynamic";

type Quiz = {
  id: string;
  title: string;
  time_limit_seconds: number;
  join_code: string;
  scheduled_at: string | null;
  opens_at: string | null;
  closes_at: string | null;
  status: string;
};

export default async function PublicQuizzesPage() {
  let rows: Quiz[] = [];
  const winners: Record<string, { in_game_name: string; score: number; max_score: number } | null> =
    {};

  if (hasSupabase()) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("quizzes")
      .select(
        "id, title, time_limit_seconds, join_code, scheduled_at, opens_at, closes_at, status",
      )
      .neq("status", "draft")
      .order("created_at", { ascending: false });
    rows = (data ?? []) as Quiz[];
    for (const q of rows) {
      const { data: best } = await supabase
        .from("quiz_attempts")
        .select("in_game_name, score, max_score")
        .eq("quiz_id", q.id)
        .order("score", { ascending: false })
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (best) {
        winners[q.id] = best as { in_game_name: string; score: number; max_score: number };
      } else {
        winners[q.id] = null;
      }
    }
  }

  return (
    <WuxiaShell>
      <div className="mb-8 text-center">
        <h1 className="font-display text-3xl text-gold-bright">Quizzes</h1>
        <p className="mt-2 mx-auto max-w-2xl text-mist">
          Start and end use your own device time zone. The room has a hard close when the time budget
          runs out (questions x seconds per question from open). One attempt per browser for each quiz.
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
          const canEnter =
            openAt &&
            !isNotYetOpen(openAt) &&
            (q.closes_at ? !isExpired(q.closes_at) : true) &&
            q.status !== "ended";
          const done =
            (q.closes_at && isExpired(q.closes_at)) || q.status === "ended";
          return (
            <Card key={q.id} delay={0.04 * i}>
              <h2 className="font-display text-lg text-gold-bright">{q.title}</h2>
              <p className="mt-1 text-sm text-mist">
                {q.time_limit_seconds}s per question, status: {q.status}
              </p>
              {openAt && (
                <p className="text-xs text-mist">
                  Opens (your time): {new Date(openAt).toLocaleString()}
                </p>
              )}
              {q.closes_at && (
                <p className="text-xs text-mist">
                  Room closes (your time): {new Date(q.closes_at).toLocaleString()}
                </p>
              )}
              {openAt && (q.status === "scheduled" || q.status === "live") && isNotYetOpen(openAt) && (
                <div className="mt-2">
                  <PublicCountdown targetIso={openAt} label="Starts in" />
                </div>
              )}
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
              {done && (
                <div className="mt-3 text-sm text-mist">
                  <p>Quiz closed.</p>
                  {winners[q.id] && (
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
