"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getOrCreatePlayerKey } from "@/lib/player-key";
import { LocalDateTime } from "@/components/community/local-date-time";
import { isExpired, isNotYetOpen } from "@/lib/quiz-times";

export type TrialQuizProps = {
  quiz: {
    id: string;
    title: string;
    quiz_type: "trial";
    status: string;
    scheduled_at: string | null;
    opens_at: string | null;
    closes_at: string | null;
    time_per_question_seconds: number | null;
    time_limit_seconds: number | null;
  };
  questions: Array<{
    id: string;
    question: string;
    options: string[];
    sort_order: number;
    correct_index: number;
  }>;
  simulation?: boolean;
};

type TopRow = {
  in_game_name: string;
  score: number;
  max_score: number;
};

export function QuizTrialPlayer({ quiz, questions, simulation = false }: TrialQuizProps) {
  const supabase = useMemo(() => createClient(), []);
  const perQ = quiz.time_per_question_seconds ?? quiz.time_limit_seconds ?? 30;
  const maxScore = Math.max(questions.length, 1);
  const openAt = quiz.opens_at ?? quiz.scheduled_at;
  const closesAt = quiz.closes_at ?? null;

  const advancingRef = useRef(false);

  const [playerKey, setPlayerKey] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [top3, setTop3] = useState<TopRow[]>([]);
  const [myAttempt, setMyAttempt] = useState<TopRow | null>(null);
  const [phase, setPhase] = useState<"enter" | "play" | "done">("enter");
  const [qIndex, setQIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(perQ);
  const [msg, setMsg] = useState<string | null>(null);
  const [initDone, setInitDone] = useState(false);

  const tickRef = useRef<number | null>(null);
  const scoreRef = useRef(0);

  const refreshBoard = useCallback(async () => {
    const { data: board } = await supabase
      .from("quiz_attempts")
      .select("in_game_name, score, max_score")
      .eq("quiz_id", quiz.id)
      .order("score", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(3);
    setTop3((board ?? []) as TopRow[]);
  }, [quiz.id, supabase]);

  const loadSelf = useCallback(
    async (key: string) => {
      const { data: me } = await supabase
        .from("quiz_attempts")
        .select("in_game_name, score, max_score")
        .eq("quiz_id", quiz.id)
        .eq("player_key", key)
        .maybeSingle();
      setMyAttempt(me as TopRow | null);
      if (me && !simulation) setPhase("done");
    },
    [quiz.id, simulation, supabase],
  );

  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  useEffect(() => {
    const key = getOrCreatePlayerKey();
    setPlayerKey(key);
    void (async () => {
      await refreshBoard();
      await loadSelf(key);
      setInitDone(true);
    })();
  }, [loadSelf, refreshBoard]);

  useEffect(() => {
    if (!playerKey) return;
    const channel = supabase
      .channel(`trial-attempts-${quiz.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "quiz_attempts", filter: `quiz_id=eq.${quiz.id}` },
        () => void refreshBoard(),
      )
      .subscribe();
    return () => void supabase.removeChannel(channel);
  }, [playerKey, quiz.id, refreshBoard, supabase]);

  function clearQuestionTimer() {
    if (tickRef.current !== null) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }

  useEffect(() => () => clearQuestionTimer(), []);

  const windowTooEarly = simulation ? false : openAt ? isNotYetOpen(openAt) : false;
  const windowClosed = simulation ? false : closesAt ? isExpired(closesAt) : false;
  const trialHasSchedule = simulation ? questions.length > 0 : openAt != null;

  const current = questions[qIndex];

  const finishAttempt = useCallback(
    async (finalScore: number) => {
      clearQuestionTimer();
      setPhase("done");
      const name = nameInput.trim();
      if (!simulation && name && playerKey) {
        const { error } = await supabase.from("quiz_attempts").insert({
          quiz_id: quiz.id,
          player_key: playerKey,
          in_game_name: name.slice(0, 64),
          score: Math.min(maxScore, Math.max(0, finalScore)),
          max_score: maxScore,
        });
        if (error) {
          if (/duplicate key|unique/i.test(error.message)) {
            setMsg("Score already recorded for this browser.");
          } else setMsg(error.message);
        }
        await refreshBoard();
        await loadSelf(playerKey);
      } else if (simulation) {
        setMsg(
          `Practice run — score not saved: ${Math.min(maxScore, Math.max(0, finalScore))}/${maxScore}.`,
        );
        await refreshBoard();
      }
    },
    [loadSelf, maxScore, nameInput, playerKey, quiz.id, refreshBoard, simulation, supabase],
  );

  const advanceOrFinish = useCallback(
    (pointsDelta: number) => {
      if (advancingRef.current) return;
      advancingRef.current = true;

      const nextScore = scoreRef.current + pointsDelta;
      scoreRef.current = nextScore;
      setScore(nextScore);

      clearQuestionTimer();
      if (qIndex + 1 >= questions.length) {
        void finishAttempt(nextScore).finally(() => {
          advancingRef.current = false;
        });
        return;
      }
      setQIndex((i) => i + 1);
      advancingRef.current = false;
    },
    [finishAttempt, qIndex, questions.length],
  );

  useEffect(() => {
    if (phase !== "play" || !current) return;
    clearQuestionTimer();
    setTimeLeft(perQ);
    setPicked(null);
    const id: number = window.setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearQuestionTimer();
          advanceOrFinish(0);
          return perQ;
        }
        return t - 1;
      });
    }, 1000);
    tickRef.current = id;
    return () => clearQuestionTimer();
  }, [phase, current?.id, perQ, advanceOrFinish]);

  function pickOption(idx: number) {
    if (phase !== "play" || !current || picked !== null) return;
    clearQuestionTimer();
    setPicked(idx);
    const add = idx === current.correct_index ? 1 : 0;
    window.setTimeout(() => advanceOrFinish(add), 400);
  }

  function startAttempt() {
    const ign = nameInput.trim();
    if (!ign) {
      setMsg("Enter a display name first.");
      return;
    }
    if (!questions.length) {
      setMsg("This quiz has no questions yet.");
      return;
    }
    setMsg(null);
    setScore(0);
    scoreRef.current = 0;
    setQIndex(0);
    setPhase("play");
  }

  if (!initDone) return <p className="text-mist">Loading Sect Trial…</p>;

  if (!questions.length) {
    return <p className="text-mist">This quiz has no questions yet.</p>;
  }

  if (!simulation && !openAt) {
    return <p className="text-mist">This trial has no start window configured yet.</p>;
  }

  if (!simulation && (quiz.status === "ended" || windowClosed)) {
    return (
      <div className="mx-auto max-w-6xl space-y-4">
        <h1 className="font-display text-2xl text-gold-bright">{quiz.title}</h1>
        <p className="text-mist">This trial window has closed.</p>
        <aside className="rounded-2xl border border-gold/25 bg-card/70 p-4">
          <p className="text-xs uppercase tracking-wide text-mist">Top 3</p>
          <ol className="mt-2 space-y-2">
            {top3.map((r, i) => (
              <li key={`${r.in_game_name}-${i}`} className="flex justify-between text-sm text-mist">
                <span>
                  #{i + 1} {r.in_game_name}
                </span>
                <span className="text-gold-bright">
                  {r.score}/{r.max_score}
                </span>
              </li>
            ))}
            {top3.length === 0 && <li className="text-sm text-mist">No attempts yet.</li>}
          </ol>
        </aside>
      </div>
    );
  }

  if (windowTooEarly) {
    return (
      <div className="mx-auto max-w-2xl space-y-3 text-center">
        <h1 className="font-display text-2xl text-gold-bright">{quiz.title}</h1>
        <p className="text-mist">The trial opens at:</p>
        {openAt && (
          <p className="text-lg text-foreground">
            <LocalDateTime iso={openAt} />
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="font-display text-2xl text-gold-bright">{quiz.title}</h1>
      {simulation && (
        <p className="mt-1 text-xs text-mist">Simulation — scores are not saved to the leaderboard.</p>
      )}
      <div className="mt-5 grid gap-4 lg:grid-cols-[280px_1fr]">
        <aside className="rounded-2xl border border-gold/25 bg-card/70 p-4">
          <p className="text-xs uppercase tracking-wide text-mist">Top 3 (trial)</p>
          <ol className="mt-3 space-y-2">
            {top3.map((r, i) => (
              <li
                key={`${r.in_game_name}-${i}`}
                className="flex items-center justify-between rounded-lg bg-void/45 px-3 py-2 text-sm"
              >
                <span className="text-mist">
                  #{i + 1} {r.in_game_name}
                </span>
                <span className="text-gold-bright">
                  {r.score}/{r.max_score}
                </span>
              </li>
            ))}
            {top3.length === 0 && <li className="text-sm text-mist">No scores yet.</li>}
          </ol>
          {closesAt && (
            <p className="mt-4 text-xs text-mist">
              Closes <LocalDateTime iso={closesAt} />
            </p>
          )}
        </aside>

        <section className="rounded-2xl border border-gold/25 bg-card/80 p-5">
          {msg && <p className="mb-3 text-sm text-mist">{msg}</p>}

          {phase === "enter" && (
            <div className="space-y-3">
              <p className="text-mist">
                One attempt per browser{simulation ? " (simulation can be repeated)" : ""}. Finish all questions
                before the room closes.
              </p>
              {myAttempt && !simulation && (
                <p className="text-sm text-gold/90">
                  Your recorded score: {myAttempt.score}/{myAttempt.max_score} as {myAttempt.in_game_name}
                </p>
              )}
              <input
                className="w-full rounded-lg border border-gold/25 bg-void px-3 py-2"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                maxLength={64}
                placeholder="Display name"
                disabled={!!myAttempt && !simulation}
              />
              <button
                type="button"
                disabled={(!simulation && !!myAttempt) || !trialHasSchedule}
                onClick={startAttempt}
                className="rounded-xl bg-gold px-4 py-2 text-sm font-semibold text-void disabled:opacity-50"
              >
                {(myAttempt && !simulation) ? "Already submitted" : "Start attempt"}
              </button>
            </div>
          )}

          {phase === "play" && current && (
            <div>
              <div className="mb-3 flex items-center justify-between text-sm">
                <span className="text-mist">
                  Question {qIndex + 1}/{questions.length}
                </span>
                <span className="text-gold-bright tabular-nums">{timeLeft}s</span>
              </div>
              <p className="text-lg text-foreground">{current.question}</p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {current.options.slice(0, 4).map((opt, idx) => (
                  <button
                    key={`${current.id}-${idx}`}
                    type="button"
                    disabled={picked !== null}
                    onClick={() => pickOption(idx)}
                    className="rounded-xl border border-gold/20 bg-void/40 px-3 py-3 text-left text-sm text-mist transition hover:border-gold/40 hover:text-foreground disabled:opacity-60"
                  >
                    <span className="mr-2 text-gold-bright">{String.fromCharCode(65 + idx)}.</span>
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {phase === "done" && (
            <div className="space-y-2">
              {!simulation && myAttempt && (
                <p className="text-mist">
                  Saved: <span className="text-gold-bright">{myAttempt.score}/{myAttempt.max_score}</span>
                </p>
              )}
              {simulation && <p className="text-mist">{msg ?? "Practice complete."}</p>}
              {simulation && (
                <button
                  type="button"
                  onClick={() => {
                    setPhase("enter");
                    setMsg(null);
                  }}
                  className="rounded-xl border border-gold/40 px-4 py-2 text-sm text-gold-bright"
                >
                  Practice again
                </button>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
