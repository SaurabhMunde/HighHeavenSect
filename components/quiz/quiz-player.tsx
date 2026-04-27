"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getOrCreatePlayerKey } from "@/lib/player-key";
import { computeClosesAtIso, isExpired, isNotYetOpen } from "@/lib/quiz-times";
import { motion, AnimatePresence } from "framer-motion";

type QRow = {
  id: string;
  question: string;
  options: string[];
  correct_index: number;
};

type Quiz = {
  id: string;
  title: string;
  time_limit_seconds: number;
  status: string;
  scheduled_at: string | null;
  opens_at: string | null;
  closes_at: string | null;
};

type Phase = "load" | "lobby" | "name" | "question" | "done" | "closed";

export function QuizPlayer({ code }: { code: string }) {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<QRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("load");
  const [qIndex, setQIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [score, setScore] = useState(0);
  const [inGame, setInGame] = useState("");
  const [lobbyToOpen, setLobbyToOpen] = useState(0);
  const [globalLeft, setGlobalLeft] = useState(0);
  const [existing, setExisting] = useState<{ score: number; max: number } | null>(null);
  const [topWinner, setTopWinner] = useState<{
    in_game_name: string;
    score: number;
    max_score: number;
  } | null>(null);
  const saveOnce = useRef(false);

  const load = useCallback(async () => {
    const supabase = createClient();
    const normalized = code.trim().toLowerCase();
    const { data: qz, error } = await supabase
      .from("quizzes")
      .select(
        "id, title, time_limit_seconds, status, scheduled_at, opens_at, closes_at, join_code",
      )
      .ilike("join_code", normalized)
      .maybeSingle();
    if (error || !qz) {
      setErr("Quiz not found.");
      return;
    }
    const Q = qz as Quiz;
    if (!Q.opens_at && Q.scheduled_at) {
      Q.opens_at = Q.scheduled_at;
    }
    const { data: qs } = await supabase
      .from("quiz_questions")
      .select("id, question, options, correct_index, sort_order")
      .eq("quiz_id", Q.id)
      .order("sort_order", { ascending: true });
    const list = (qs || []).map((r: { options: unknown }) => ({
      ...r,
      options: Array.isArray(r.options) ? (r.options as string[]) : [],
    })) as QRow[];
    setQuestions(list);
    const o = Q.opens_at || Q.scheduled_at;
    if (!Q.closes_at && o && list.length > 0) {
      Q.closes_at = computeClosesAtIso(
        o,
        Q.time_limit_seconds,
        list.length,
      );
    }
    setQuiz(Q);
    const player = getOrCreatePlayerKey();
    const { data: att } = await supabase
      .from("quiz_attempts")
      .select("score, max_score")
      .eq("quiz_id", Q.id)
      .eq("player_key", player)
      .maybeSingle();
    if (att) {
      setExisting({ score: att.score, max: att.max_score });
    }
    const { data: best } = await supabase
      .from("quiz_attempts")
      .select("in_game_name, score, max_score, created_at")
      .eq("quiz_id", Q.id)
      .order("score", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (best) setTopWinner(best);
    if (Q.closes_at && isExpired(Q.closes_at) && !att) {
      setPhase("closed");
    } else {
      setPhase("lobby");
    }
  }, [code]);

  useEffect(() => {
    load();
  }, [load]);

  const opens = quiz?.opens_at || quiz?.scheduled_at || null;
  const closes = quiz?.closes_at || null;
  const hardExpired = closes ? isExpired(closes) : false;
  const beforeOpen = opens ? isNotYetOpen(opens) : false;

  useEffect(() => {
    if (phase === "load" || !opens) return;
    if (beforeOpen) {
      const t = setInterval(() => {
        setLobbyToOpen(
          Math.max(0, Math.floor((new Date(opens).getTime() - Date.now()) / 1000)),
        );
      }, 200);
      return () => clearInterval(t);
    }
  }, [phase, opens, beforeOpen]);

  useEffect(() => {
    if (phase !== "question" || !quiz || !closes) return;
    const t = setInterval(() => {
      setGlobalLeft(
        Math.max(0, Math.floor((new Date(closes).getTime() - Date.now()) / 1000)),
      );
    }, 200);
    return () => clearInterval(t);
  }, [phase, quiz, closes]);

  const current = questions[qIndex] ?? null;

  useEffect(() => {
    if (phase !== "question" || !quiz || !current) return;
    if (closes && isExpired(closes)) {
      setPhase("done");
      return;
    }
    setSecondsLeft(quiz.time_limit_seconds);
    const id = setInterval(() => {
      if (closes && Date.now() >= new Date(closes).getTime()) {
        setPhase("done");
        return;
      }
      setSecondsLeft((s) => {
        if (s === 0) return 0;
        const n = s - 1;
        if (n === 0) {
          setQIndex((qi) => {
            if (qi + 1 >= questions.length) {
              setPhase("done");
              return qi;
            }
            return qi + 1;
          });
        }
        return n;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phase, qIndex, quiz, current, questions.length, closes]);

  useEffect(() => {
    if (phase !== "done" || !quiz || !questions.length) return;
    if (!inGame.trim() || saveOnce.current) return;
    (async () => {
      if (saveOnce.current) return;
      const s = createClient();
      const key = getOrCreatePlayerKey();
      const { error } = await s.from("quiz_attempts").insert({
        quiz_id: quiz.id,
        player_key: key,
        in_game_name: inGame.trim(),
        score,
        max_score: questions.length,
      });
      saveOnce.current = true;
      if (error && !/duplicate|unique/i.test(String(error.message))) {
        setErr(error.message);
      }
    })();
  }, [phase, quiz, inGame, score, questions.length]);

  function startNameStep() {
    if (!quiz) return;
    if (questions.length === 0) {
      setErr("No questions in this round yet.");
      return;
    }
    if (existing) {
      setErr("You have already completed this quiz on this device.");
      return;
    }
    if (beforeOpen) return;
    if (hardExpired) {
      setErr("This quiz is closed. See results below if available.");
      setPhase("closed");
      return;
    }
    setPhase("name");
  }

  function startQuestions() {
    if (!inGame.trim()) {
      setErr("Enter your in-game name to start.");
      return;
    }
    setErr(null);
    setQIndex(0);
    setScore(0);
    if (closes) {
      setGlobalLeft(
        Math.max(0, Math.floor((new Date(closes).getTime() - Date.now()) / 1000)),
      );
    }
    setPhase("question");
  }

  function pick(i: number) {
    if (!current || !quiz) return;
    if (closes && Date.now() >= new Date(closes).getTime()) {
      setPhase("done");
      return;
    }
    if (i === current.correct_index) setScore((s) => s + 1);
    if (qIndex + 1 >= questions.length) {
      setPhase("done");
    } else {
      setQIndex((x) => x + 1);
    }
  }

  if (err && phase === "load") {
    return <p className="text-center text-red-400">{err}</p>;
  }
  if (!quiz || phase === "load") {
    return <p className="text-mist">Opening scroll…</p>;
  }

  if (existing && phase === "lobby") {
    return (
      <div className="mx-auto max-w-lg text-center">
        <h1 className="font-display text-2xl text-gold-bright">{quiz.title}</h1>
        <p className="mt-4 text-mist">You have already completed this round on this device.</p>
        <p className="mt-2 font-display text-2xl text-gold-bright">
          {existing.score} / {existing.max}
        </p>
      </div>
    );
  }

  if (hardExpired && (phase === "lobby" || phase === "closed" || (phase === "name" && !inGame))) {
    return (
      <div className="mx-auto max-w-lg text-center">
        <h1 className="font-display text-2xl text-gold-bright">{quiz.title}</h1>
        <p className="mt-4 text-mist">This quiz is closed. Times follow your device clock.</p>
        {topWinner && (
          <div className="mt-6 rounded-2xl border border-gold/25 bg-card/80 p-5">
            <p className="text-sm text-mist">Top result</p>
            <p className="mt-1 text-lg text-gold-bright">
              {topWinner.in_game_name}{" "}
              <span className="text-mist">
                ({topWinner.score} / {topWinner.max_score})
              </span>
            </p>
          </div>
        )}
        {!topWinner && <p className="mt-4 text-sm text-mist">No entries recorded yet.</p>}
        {opens && (
          <p className="mt-2 text-xs text-mist/80">
            Window was {new Date(opens).toLocaleString()} to{" "}
            {closes ? new Date(closes).toLocaleString() : "n/a"}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-center font-display text-2xl text-gold-bright">{quiz.title}</h1>
      {err && <p className="mt-2 text-center text-sm text-red-400">{err}</p>}
      {phase === "lobby" && (
        <div className="mt-8 text-center">
          {beforeOpen && (
            <div>
              <p className="text-mist">Opens at (your local time):</p>
              <p className="mt-1 text-gold-bright">
                {opens && new Date(opens).toLocaleString()}
              </p>
              <p className="mt-2 font-display text-5xl text-gold-bright tabular-nums">
                {lobbyToOpen}
              </p>
            </div>
          )}
          {!beforeOpen && !hardExpired && (
            <button
              type="button"
              onClick={startNameStep}
              className="mt-4 rounded-2xl bg-gold px-6 py-3 font-semibold text-void"
            >
              Continue
            </button>
          )}
          <p className="mt-4 text-sm text-mist">
            {questions.length} questions, {quiz.time_limit_seconds}s each, total time cap{" "}
            {questions.length * quiz.time_limit_seconds}s from open.
          </p>
          {closes && (
            <p className="text-xs text-mist/80">
              Room closes: {new Date(closes).toLocaleString()} (local)
            </p>
          )}
        </div>
      )}
      {phase === "name" && (
        <div className="mt-6 space-y-3 rounded-2xl border border-gold/25 bg-card/80 p-5">
          <label className="text-sm text-mist" htmlFor="ig">
            In-game name (once per device for this quiz)
          </label>
          <input
            id="ig"
            className="w-full rounded-lg border border-gold/25 bg-void px-3 py-2"
            value={inGame}
            onChange={(e) => setInGame(e.target.value)}
            maxLength={64}
            autoFocus
            placeholder="IGN"
          />
          <button
            type="button"
            onClick={startQuestions}
            className="w-full rounded-xl bg-gold py-2.5 text-sm font-semibold text-void"
          >
            Start quiz
          </button>
        </div>
      )}
      <AnimatePresence mode="wait">
        {phase === "question" && current && (
          <motion.div
            key={current.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="mt-6 rounded-2xl border border-gold/25 bg-card/80 p-5"
          >
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm text-mist">
              <span>
                {qIndex + 1}/{questions.length}
              </span>
              <span className="text-gold-bright tabular-nums">Q: {secondsLeft}s</span>
              {closes && (
                <span className="text-mist/90 tabular-nums">Total left: {globalLeft}s</span>
              )}
            </div>
            <p className="text-lg text-foreground">{current.question}</p>
            <div className="mt-4 space-y-2">
              {current.options.map((o, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => pick(i)}
                  className="block w-full rounded-xl border border-gold/20 bg-void/50 px-3 py-2.5 text-left text-sm text-mist transition hover:border-gold/40 hover:text-foreground"
                >
                  {o}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {phase === "done" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-8 text-center"
        >
          <p className="text-mist">Spar complete</p>
          <p className="mt-2 font-display text-3xl text-gold-bright">
            {score} / {questions.length}
          </p>
        </motion.div>
      )}
    </div>
  );
}
