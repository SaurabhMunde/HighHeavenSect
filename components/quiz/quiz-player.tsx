"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getOrCreatePlayerKey } from "@/lib/player-key";
import { computeClosesAtIso, isExpired, isNotYetOpen } from "@/lib/quiz-times";
import { motion, AnimatePresence } from "framer-motion";
import { statusLabel } from "@/lib/quiz-meta";

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
  quiz_type: "trial" | "tournament";
  join_window_seconds: number;
  status: string;
  scheduled_at: string | null;
  opens_at: string | null;
  closes_at: string | null;
};

type Phase = "load" | "lobby" | "name" | "question" | "done" | "closed";

type RankRow = {
  player_key: string;
  in_game_name: string;
  score: number;
  current_question: number;
};

export function QuizPlayer({
  code,
  simulation = false,
}: {
  code: string;
  simulation?: boolean;
}) {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<QRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("load");
  const [qIndex, setQIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [score, setScore] = useState(0);
  const [inGame, setInGame] = useState("");
  const [lobbyToOpen, setLobbyToOpen] = useState(0);
  const [tournamentToStart, setTournamentToStart] = useState(0);
  const [globalLeft, setGlobalLeft] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [existing, setExisting] = useState<{ score: number; max: number } | null>(null);
  const [ranks, setRanks] = useState<RankRow[]>([]);
  const [tournamentJoined, setTournamentJoined] = useState(false);
  const [topWinner, setTopWinner] = useState<{
    in_game_name: string;
    score: number;
    max_score: number;
  } | null>(null);
  const questionStartedAt = useRef<number>(0);
  const selfPlayerKey = useRef<string>("");
  const saveOnce = useRef(false);
  const isSimulationRun = simulation;
  const audioCtxRef = useRef<AudioContext | null>(null);
  const lastQuestionBeepRef = useRef<number>(-1);
  const lastLobbyBeepRef = useRef<number>(-1);

  const playBeep = useCallback(({
    frequency = 780,
    durationMs = 90,
  }: {
    frequency?: number;
    durationMs?: number;
  }) => {
    if (typeof window === "undefined") return;
    const Ctx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    if (!audioCtxRef.current) {
      audioCtxRef.current = new Ctx();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === "suspended") {
      void ctx.resume();
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = frequency;
    gain.gain.value = 0.0001;
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;
    gain.gain.linearRampToValueAtTime(0.08, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000);
    osc.start(now);
    osc.stop(now + durationMs / 1000 + 0.02);
  }, []);

  const load = useCallback(async () => {
    const supabase = createClient();
    const normalized = code.trim().toLowerCase();
    const { data: qz, error } = await supabase
      .from("quizzes")
      .select(
        "id, title, time_limit_seconds, quiz_type, join_window_seconds, status, scheduled_at, opens_at, closes_at, join_code",
      )
      .ilike("join_code", normalized)
      .maybeSingle();
    if (error || !qz) {
      setErr("Quiz not found.");
      return;
    }
    const Q = qz as Quiz;
    if (Q.status === "simulation" && !isSimulationRun) {
      setErr("This quiz is in simulation mode (admin only).");
      return;
    }
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
    selfPlayerKey.current = player;
    if (Q.quiz_type === "tournament") {
      const { data: live } = await supabase
        .from("quiz_tournament_sessions")
        .select("player_key, in_game_name, score, current_question")
        .eq("quiz_id", Q.id)
        .order("score", { ascending: false })
        .order("updated_at", { ascending: true });
      setRanks((live ?? []) as RankRow[]);
    }
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
    if (!isSimulationRun && Q.closes_at && isExpired(Q.closes_at) && !att) {
      setPhase("closed");
    } else {
      setPhase("lobby");
    }
  }, [code, isSimulationRun]);

  useEffect(() => {
    load();
  }, [load]);

  const opens = quiz?.opens_at || quiz?.scheduled_at || null;
  const closes = quiz?.closes_at || null;
  const hardExpired = closes ? isExpired(closes) : false;
  const isTournament = quiz?.quiz_type === "tournament";
  const joinWindowSeconds = quiz?.join_window_seconds ?? 45;
  const joinDeadline =
    opens && isTournament ? new Date(new Date(opens).getTime() + joinWindowSeconds * 1000).toISOString() : null;
  const joinClosed = joinDeadline ? isExpired(joinDeadline) : false;
  const isScheduled = quiz?.status === "scheduled";
  const isBeforeScheduledOpen = isScheduled && opens ? isNotYetOpen(opens) : false;
  const isStatusAllowed = quiz ? ["live", "scheduled", "simulation"].includes(quiz.status) : false;

  useEffect(() => {
    if (phase === "load" || !opens || isSimulationRun) return;
    if (isBeforeScheduledOpen) {
      const t = setInterval(() => {
        setLobbyToOpen(
          Math.max(0, Math.floor((new Date(opens).getTime() - Date.now()) / 1000)),
        );
      }, 200);
      return () => clearInterval(t);
    }
  }, [phase, opens, isBeforeScheduledOpen, isSimulationRun]);

  useEffect(() => {
    if (!joinDeadline || phase !== "name" || !tournamentJoined || !isTournament) return;
    const id = setInterval(() => {
      const secs = Math.max(
        0,
        Math.floor((new Date(joinDeadline).getTime() - Date.now()) / 1000),
      );
      setTournamentToStart(secs);
    }, 200);
    return () => clearInterval(id);
  }, [joinDeadline, phase, tournamentJoined, isTournament]);

  useEffect(() => {
    if (!isTournament || phase !== "name" || !tournamentJoined) return;
    if (joinClosed || tournamentToStart <= 0) {
      questionStartedAt.current = Date.now();
      setAnswered(false);
      setPhase("question");
    }
  }, [isTournament, phase, tournamentJoined, joinClosed, tournamentToStart]);

  useEffect(() => {
    if (phase !== "question" || secondsLeft <= 0 || secondsLeft > 3) return;
    if (lastQuestionBeepRef.current === secondsLeft) return;
    lastQuestionBeepRef.current = secondsLeft;
    playBeep({ frequency: 720 + secondsLeft * 60, durationMs: 100 });
  }, [phase, secondsLeft, playBeep]);

  useEffect(() => {
    if (!(isTournament && phase === "name" && tournamentJoined)) return;
    if (tournamentToStart <= 0 || tournamentToStart > 3) return;
    if (lastLobbyBeepRef.current === tournamentToStart) return;
    lastLobbyBeepRef.current = tournamentToStart;
    playBeep({ frequency: 560 + tournamentToStart * 80, durationMs: 80 });
  }, [isTournament, phase, tournamentJoined, tournamentToStart, playBeep]);

  useEffect(() => {
    if (!quiz || !isTournament) return;
    if (!(phase === "lobby" || phase === "question" || phase === "done")) return;
    const supabase = createClient();
    const id = setInterval(async () => {
      const { data } = await supabase
        .from("quiz_tournament_sessions")
        .select("player_key, in_game_name, score, current_question")
        .eq("quiz_id", quiz.id)
        .order("score", { ascending: false })
        .order("updated_at", { ascending: true });
      setRanks((data ?? []) as RankRow[]);
    }, 1500);
    return () => clearInterval(id);
  }, [quiz, isTournament, phase]);

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
    if (!isSimulationRun && closes && isExpired(closes)) {
      setPhase("done");
      return;
    }
    setSecondsLeft(quiz.time_limit_seconds);
    setAnswered(false);
    lastQuestionBeepRef.current = -1;
    const id = setInterval(() => {
      if (!isSimulationRun && closes && Date.now() >= new Date(closes).getTime()) {
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
  }, [phase, qIndex, quiz, current, questions.length, closes, isSimulationRun]);

  useEffect(() => {
    if (phase !== "done" || !quiz || !questions.length) return;
    if (!inGame.trim() || saveOnce.current) return;
    if (isSimulationRun || quiz.status === "simulation") return;
    (async () => {
      if (saveOnce.current) return;
      const s = createClient();
      const key = getOrCreatePlayerKey();
      const { error } = await s.from("quiz_attempts").insert({
        quiz_id: quiz.id,
        player_key: key,
        in_game_name: inGame.trim(),
        score,
        max_score: quiz.quiz_type === "trial" ? questions.length : questions.length * 1000,
      });
      saveOnce.current = true;
      if (error && !/duplicate|unique/i.test(String(error.message))) {
        setErr(error.message);
      }
    })();
  }, [phase, quiz, inGame, score, questions.length, isSimulationRun]);

  function startNameStep() {
    if (!quiz) return;
    if (!isSimulationRun && !isStatusAllowed) {
      setErr(`Quiz is ${quiz.status} (${statusLabel(quiz.status)}).`);
      return;
    }
    if (questions.length === 0) {
      setErr("No questions in this round yet.");
      return;
    }
    if (existing) {
      setErr("You have already completed this quiz on this device.");
      return;
    }
    if (!isSimulationRun && isBeforeScheduledOpen) {
      return;
    }
    if (!isSimulationRun && hardExpired) {
      setErr("This quiz is closed. See results below if available.");
      setPhase("closed");
      return;
    }
    if (!isSimulationRun && quiz.quiz_type === "tournament" && joinClosed) {
      setErr("Join window is closed for this tournament.");
      setPhase("closed");
      return;
    }
    setTournamentJoined(false);
    setPhase("name");
  }

  function startQuestions() {
    if (!quiz) return;
    if (!inGame.trim()) {
      setErr("Enter your in-game name to start.");
      return;
    }
    setErr(null);
    setQIndex(0);
    setScore(0);
    setAnswered(false);
    if (closes) {
      setGlobalLeft(
        Math.max(0, Math.floor((new Date(closes).getTime() - Date.now()) / 1000)),
      );
    }
    if (quiz.quiz_type === "tournament") {
      const supabase = createClient();
      const key = getOrCreatePlayerKey();
      void supabase.from("quiz_tournament_sessions").upsert(
        {
          quiz_id: quiz.id,
          player_key: key,
          in_game_name: inGame.trim(),
          score: 0,
          current_question: 0,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "quiz_id,player_key" },
      );
      setTournamentJoined(true);
      if (joinClosed || isSimulationRun) {
        questionStartedAt.current = Date.now();
        setAnswered(false);
        setPhase("question");
      }
      return;
    }
    questionStartedAt.current = Date.now();
    setPhase("question");
  }

  async function pick(i: number) {
    if (!current || !quiz) return;
    if (answered) return;
    setAnswered(true);
    if (!isSimulationRun && closes && Date.now() >= new Date(closes).getTime()) {
      setPhase("done");
      return;
    }
    if (quiz.quiz_type === "trial") {
      if (i === current.correct_index) setScore((s) => s + 1);
    } else {
      const responseMs = Math.max(0, Date.now() - questionStartedAt.current);
      const maxMs = Math.max(1, quiz.time_limit_seconds * 1000);
      const isCorrect = i === current.correct_index;
      const bonus = Math.floor((Math.max(0, maxMs - responseMs) / maxMs) * 900);
      const points = isCorrect ? 100 + bonus : 0;
      const nextScore = score + points;
      setScore(nextScore);
      const s = createClient();
      const key = getOrCreatePlayerKey();
      const { error: insertErr } = await s.from("quiz_tournament_answers").insert({
        quiz_id: quiz.id,
        question_id: current.id,
        player_key: key,
        answer_index: i,
        is_correct: isCorrect,
        points,
        response_ms: responseMs,
      });
      if (insertErr && !/duplicate|unique/i.test(String(insertErr.message))) {
        setErr(insertErr.message);
      }
      await s.from("quiz_tournament_sessions").upsert(
        {
          quiz_id: quiz.id,
          player_key: key,
          in_game_name: inGame.trim() || "Anonymous",
          score: nextScore,
          current_question: Math.min(qIndex + 1, questions.length),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "quiz_id,player_key" },
      );
    }
    if (qIndex + 1 >= questions.length) {
      setPhase("done");
    } else {
      window.setTimeout(() => {
        setQIndex((x) => x + 1);
        questionStartedAt.current = Date.now();
      }, 250);
    }
  }

  if (err && phase === "load") {
    return <p className="text-center text-red-400">{err}</p>;
  }
  if (!quiz || phase === "load") {
    return <p className="text-mist">Opening scroll…</p>;
  }

  if (existing && phase === "lobby" && !isTournament) {
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

  if (
    !isSimulationRun &&
    hardExpired &&
    (phase === "lobby" || phase === "closed" || (phase === "name" && !inGame))
  ) {
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

  if (!isSimulationRun && !isStatusAllowed && (phase === "lobby" || phase === "name")) {
    return (
      <div className="mx-auto max-w-lg text-center">
        <h1 className="font-display text-2xl text-gold-bright">{quiz.title}</h1>
        <p className="mt-4 text-mist">
          This quiz is locked ({statusLabel(quiz.status)}). It will open for players when officers set it to live.
        </p>
        {opens && (
          <p className="mt-2 text-xs text-mist/80">
            Scheduled open: {new Date(opens).toLocaleString()} (local)
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="font-display text-2xl text-gold-bright">{quiz.title}</h1>
      {err && <p className="mt-2 text-center text-sm text-red-400">{err}</p>}
      {phase === "lobby" && (
        <div className="mt-8 text-center">
          {isBeforeScheduledOpen && !isSimulationRun && (
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
          {(isSimulationRun || (!isBeforeScheduledOpen && !hardExpired)) && (
            <button
              type="button"
              onClick={startNameStep}
              className="mt-4 rounded-2xl bg-gold px-6 py-3 font-semibold text-void"
            >
              Continue
            </button>
          )}
          {isSimulationRun && (
            <p className="mt-2 text-xs text-mist">
              Simulation run ignores start/end locks so admins can test flow safely.
            </p>
          )}
          <p className="mt-4 text-sm text-mist">
            {questions.length} questions, {quiz.time_limit_seconds}s each
            {quiz.quiz_type === "trial"
              ? `, total time cap ${questions.length * quiz.time_limit_seconds}s from open.`
              : "."}
          </p>
          {quiz.quiz_type === "tournament" && joinDeadline && (
            <p className="mt-2 text-xs text-mist">
              Join window ends: {new Date(joinDeadline).toLocaleString()} (local)
            </p>
          )}
          {quiz.quiz_type === "tournament" && (
            <p className="mt-1 text-xs text-mist/80">
              Tournament starts automatically when join window ends.
            </p>
          )}
          {quiz.quiz_type === "tournament" && (
            <div className="mx-auto mt-4 max-w-md rounded-xl border border-gold/20 bg-void/40 p-3 text-left">
              <p className="text-xs text-mist">Live ranking</p>
              <ol className="mt-2 space-y-1 text-sm">
                {ranks.slice(0, 6).map((r, idx) => (
                  <motion.li
                    key={r.player_key}
                    layout
                    transition={{ type: "spring", stiffness: 240, damping: 24 }}
                    className="flex items-center justify-between"
                  >
                    <span className={r.player_key === selfPlayerKey.current ? "text-gold-bright" : "text-mist"}>
                      #{idx + 1} {r.in_game_name}
                    </span>
                    <span className="text-gold-bright">{r.score}</span>
                  </motion.li>
                ))}
                {ranks.length === 0 && <li className="text-mist">Waiting for players...</li>}
              </ol>
            </div>
          )}
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
            disabled={isTournament && tournamentJoined}
            maxLength={64}
            autoFocus
            placeholder="IGN"
          />
          {!isTournament && (
            <button
              type="button"
              onClick={startQuestions}
              className="w-full rounded-xl bg-gold py-2.5 text-sm font-semibold text-void"
            >
              Start quiz
            </button>
          )}
          {isTournament && !tournamentJoined && (
            <button
              type="button"
              onClick={startQuestions}
              className="w-full rounded-xl bg-gold py-2.5 text-sm font-semibold text-void"
            >
              Join tournament
            </button>
          )}
          {isTournament && tournamentJoined && (
            <div className="rounded-xl border border-gold/25 bg-void/40 p-3 text-center">
              <p className="text-sm text-mist">Waiting for players...</p>
              <p className="mt-1 font-display text-4xl text-gold-bright tabular-nums">
                {tournamentToStart}
              </p>
              <p className="text-xs text-mist/80">Auto-start after join window closes.</p>
            </div>
          )}
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
                  disabled={answered}
                  className="block w-full rounded-xl border border-gold/20 bg-void/50 px-3 py-2.5 text-left text-sm text-mist transition hover:border-gold/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-75"
                >
                  {o}
                </button>
              ))}
            </div>
            {quiz.quiz_type === "tournament" && (
              <div className="mt-4 rounded-lg border border-gold/20 bg-void/30 p-3">
                <p className="text-xs text-mist">Live ranking</p>
                <ol className="mt-2 space-y-1 text-sm">
                  {ranks.slice(0, 8).map((r, idx) => (
                    <motion.li
                      key={r.player_key}
                      layout
                      transition={{ type: "spring", stiffness: 240, damping: 24 }}
                      className="flex items-center justify-between transition-all duration-300"
                    >
                      <span className={r.player_key === selfPlayerKey.current ? "text-gold-bright" : "text-mist"}>
                        #{idx + 1} {r.in_game_name}
                      </span>
                      <span className="text-gold-bright drop-shadow-[0_0_6px_rgba(237,199,122,0.65)]">{r.score}</span>
                    </motion.li>
                  ))}
                </ol>
              </div>
            )}
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
            {quiz.quiz_type === "trial" ? `${score} / ${questions.length}` : `${score} points`}
          </p>
          {quiz.quiz_type === "tournament" && (
            <div className="mx-auto mt-6 max-w-md rounded-2xl border border-gold/30 bg-card/80 p-4">
              <p className="text-sm text-mist">Tournament leaderboard</p>
              {ranks.length >= 3 && (
                <div className="mt-3 grid grid-cols-3 items-end gap-2">
                  {[1, 0, 2].map((pos) => {
                    const r = ranks[pos];
                    if (!r) return <div key={pos} />;
                    const h = pos === 0 ? "h-24" : pos === 1 ? "h-16" : "h-14";
                    const medal = pos === 0 ? "🥇" : pos === 1 ? "🥈" : "🥉";
                    return (
                      <motion.div
                        key={r.player_key}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.08 * pos }}
                        className={`rounded-xl border border-gold/30 bg-void/50 p-2 text-center ${h}`}
                      >
                        <p className="text-sm">{medal}</p>
                        <p className="truncate text-xs text-gold-bright">{r.in_game_name}</p>
                        <p className="text-xs text-mist">{r.score}</p>
                      </motion.div>
                    );
                  })}
                </div>
              )}
              <ol className="mt-3 space-y-2">
                {ranks.map((r, idx) => (
                  <motion.li
                    key={r.player_key}
                    layout
                    transition={{ type: "spring", stiffness: 240, damping: 24 }}
                    className="flex items-center justify-between rounded-lg bg-void/40 px-3 py-2"
                  >
                    <span
                      className={
                        idx < 3
                          ? "font-medium text-gold-bright drop-shadow-[0_0_8px_rgba(237,199,122,0.7)]"
                          : "text-mist"
                      }
                    >
                      {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`} {r.in_game_name}
                    </span>
                    <span className="text-gold-bright">{r.score}</span>
                  </motion.li>
                ))}
              </ol>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
