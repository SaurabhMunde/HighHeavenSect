"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { getOrCreatePlayerKey } from "@/lib/player-key";
import { STORAGE_ASSETS } from "@/lib/storage-public";
import { createQuizAmbient, playApplauseBurst } from "@/lib/tournament-quiz-audio";

export type TournamentQuizProps = {
  quiz: {
    id: string;
    title: string;
    quiz_type: "tournament";
    status: string;
    start_time: string | null;
    waiting_time_seconds: number;
    time_per_question_seconds: number;
  };
  questions: Array<{
    id: string;
    question: string;
    options: string[];
    sort_order: number;
  }>;
  simulation?: boolean;
};

type RankRow = {
  player_key: string;
  in_game_name: string;
  score: number;
  current_question: number;
};

type GameState = {
  phase: "waiting" | "question" | "leaderboard" | "ended";
  question_index: number;
  waiting_ends_at: string | null;
  question_started_at: string | null;
  question_ends_at: string | null;
  transition_ends_at: string | null;
  ended_at: string | null;
};

type SubmitAnswerResult = {
  accepted: boolean;
  is_correct: boolean;
  points: number;
  score: number;
  message: string;
};

function secsLeft(targetIso: string | null, nowMs: number) {
  if (!targetIso) return 0;
  return Math.max(0, Math.ceil((new Date(targetIso).getTime() - nowMs) / 1000));
}

export function TournamentQuizRoom({ quiz, questions, simulation = false }: TournamentQuizProps) {
  const supabase = useMemo(() => createClient(), []);
  const roomScope = simulation ? "simulation" : "live";
  const [supportsScope, setSupportsScope] = useState(true);
  const [game, setGame] = useState<GameState | null>(null);
  const [ranks, setRanks] = useState<RankRow[]>([]);
  const [nameInput, setNameInput] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [answerFeedback, setAnswerFeedback] = useState<string | null>(null);
  const [answeredQuestion, setAnsweredQuestion] = useState<number | null>(null);
  const [timeNow, setTimeNow] = useState(() => Date.now());
  const [initError, setInitError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [joined, setJoined] = useState(false);
  const [selfScore, setSelfScore] = useState(0);

  const selfPlayerKey = useRef("");
  const prevPhaseRef = useRef<string | null>(null);
  const prevRanksRef = useRef<string>("");
  /** Tracks last echoed second boundary per waiting/question slice */
  const tickSliceRef = useRef<{ key: string; remaining: number } | null>(null);
  const sharedCtxRef = useRef<AudioContext | null>(null);
  const ambientCtrlRef = useRef<ReturnType<typeof createQuizAmbient> | null>(null);

  const audioRef = useRef<Record<string, HTMLAudioElement | null>>({
    countdown: null,
    correct: null,
    wrong: null,
    leaderboard: null,
    winner: null,
    celebration: null,
  });

  const quizId = quiz.id;
  const currentQuestion = game ? questions[game.question_index] ?? null : null;

  const hydrateAudio = useCallback(() => {
    if (audioRef.current.countdown) return;
    const { quizSfx: q } = STORAGE_ASSETS;
    audioRef.current.countdown = new Audio(q.tick);
    audioRef.current.correct = new Audio(q.correct);
    audioRef.current.wrong = new Audio(q.wrong);
    audioRef.current.leaderboard = new Audio(q.leaderboard);
    audioRef.current.winner = new Audio(q.winner);
    const cel = new Audio(q.celebration);
    cel.volume = 0.62;
    cel.addEventListener("error", () => {
      audioRef.current.celebration = null;
    });
    audioRef.current.celebration = cel;
    cel.load();
  }, []);

  const ensureSharedCtx = useCallback(() => {
    if (!sharedCtxRef.current && typeof window !== "undefined") {
      const Ctor =
        window.AudioContext ||
        (window as Window & typeof globalThis & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      sharedCtxRef.current = new Ctor();
    }
    return sharedCtxRef.current;
  }, []);

  const playSound = useCallback((name: keyof typeof audioRef.current) => {
    const clip = audioRef.current[name];
    if (!clip) return;
    clip.currentTime = 0;
    void clip.play().catch(() => undefined);
  }, []);

  const playCountdownTick = useCallback((phaseKind: "waiting" | "question") => {
    const clip = audioRef.current.countdown;
    if (!clip) return;
    clip.volume = phaseKind === "waiting" ? 0.52 : 0.34;
    clip.currentTime = 0;
    void clip.play().catch(() => undefined);
  }, []);

  const celebrationPlayedRef = useRef(false);

  const playCelebration = useCallback(() => {
    hydrateAudio();
    const ctx = ensureSharedCtx();
    if (ctx) playApplauseBurst(ctx, 2.8);
    window.setTimeout(() => {
      playSound("winner");
      void audioRef.current.celebration?.play?.().catch(() => undefined);
    }, 340);
  }, [ensureSharedCtx, hydrateAudio, playSound]);

  const isScopeSchemaError = useCallback((message: string) => {
    return /column\s+"?scope"?\s+does not exist|function .* does not exist|no function matches/i.test(message);
  }, []);

  const fetchRanks = useCallback(
    async (rid: string) => {
      if (supportsScope) {
        const scoped = await supabase
          .from("quiz_tournament_sessions")
          .select("player_key, in_game_name, score, current_question")
          .eq("quiz_id", rid)
          .eq("scope", roomScope)
          .order("score", { ascending: false })
          .order("updated_at", { ascending: true });
        if (!scoped.error) return scoped.data as RankRow[];
        if (!isScopeSchemaError(scoped.error.message)) throw scoped.error;
        setSupportsScope(false);
      }
      const legacy = await supabase
        .from("quiz_tournament_sessions")
        .select("player_key, in_game_name, score, current_question")
        .eq("quiz_id", rid)
        .order("score", { ascending: false })
        .order("updated_at", { ascending: true });
      if (legacy.error) throw legacy.error;
      return (legacy.data ?? []) as RankRow[];
    },
    [isScopeSchemaError, roomScope, supabase, supportsScope],
  );

  const fetchGame = useCallback(
    async (gid: string) => {
      if (supportsScope) {
        const scoped = await supabase
          .from("quiz_tournament_games")
          .select(
            "scope, phase, question_index, waiting_ends_at, question_started_at, question_ends_at, transition_ends_at, ended_at",
          )
          .eq("quiz_id", gid)
          .eq("scope", roomScope)
          .maybeSingle();
        if (!scoped.error) return scoped.data as (GameState & { scope?: string }) | null;
        if (!isScopeSchemaError(scoped.error.message)) throw scoped.error;
        setSupportsScope(false);
      }
      const legacy = await supabase
        .from("quiz_tournament_games")
        .select(
          "phase, question_index, waiting_ends_at, question_started_at, question_ends_at, transition_ends_at, ended_at",
        )
        .eq("quiz_id", gid)
        .maybeSingle();
      if (legacy.error) throw legacy.error;
      return (legacy.data ?? null) as GameState | null;
    },
    [isScopeSchemaError, roomScope, supabase, supportsScope],
  );

  const runTick = useCallback(
    async (gid: string) => {
      const scoped = await supabase.rpc("quiz_tournament_tick", { p_quiz_id: gid, p_scope: roomScope });
      if (!scoped.error) return;
      if (!isScopeSchemaError(scoped.error.message)) {
        throw scoped.error;
      }
      const legacy = await supabase.rpc("quiz_tournament_tick", { p_quiz_id: gid });
      if (legacy.error && !/Could not choose the best candidate function/i.test(legacy.error.message)) {
        throw legacy.error;
      }
    },
    [isScopeSchemaError, roomScope, supabase],
  );

  useEffect(() => {
    selfPlayerKey.current = getOrCreatePlayerKey();
    let cancelled = false;
    (async () => {
      try {
        const gameRows = await fetchGame(quizId);
        if (!cancelled && gameRows) setGame(gameRows as GameState);
        const normalizedRanks = await fetchRanks(quizId);
        if (cancelled) return;
        setRanks(normalizedRanks);
        const existingMe = normalizedRanks.find((r) => r.player_key === selfPlayerKey.current);
        if (existingMe) {
          setJoined(true);
          setNameInput(existingMe.in_game_name);
          hydrateAudio();
        }
        setReady(true);
      } catch (e) {
        if (!cancelled) setInitError(e instanceof Error ? e.message : "Failed to load tournament.");
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchGame, fetchRanks, hydrateAudio, quizId]);

  useEffect(() => {
    const id = window.setInterval(() => setTimeNow(Date.now()), 200);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel(`tournament-${quizId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "quiz_tournament_games", filter: `quiz_id=eq.${quizId}` },
        (payload) => {
          const next = payload.new as GameState & { scope?: string };
          if (supportsScope && next.scope !== roomScope) return;
          setGame(next);
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "quiz_tournament_sessions", filter: `quiz_id=eq.${quizId}` },
        async () => {
          try {
            const data = await fetchRanks(quizId);
            setRanks(data);
          } catch {
            /* keep */
          }
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [fetchRanks, quizId, roomScope, supportsScope, supabase]);

  useEffect(() => {
    if (!game) return;
    const prev = prevPhaseRef.current;
    if (game.phase === prev) return;
    if (game.phase === "leaderboard") playSound("leaderboard");
    if (game.phase === "ended" && prev !== "ended" && !celebrationPlayedRef.current) {
      celebrationPlayedRef.current = true;
      playCelebration();
    }
    if (game.phase !== "ended") celebrationPlayedRef.current = false;
    prevPhaseRef.current = game.phase;
  }, [game, playCelebration, playSound]);

  useEffect(() => {
    if (!game || (game.phase !== "waiting" && game.phase !== "question")) {
      tickSliceRef.current = null;
      return;
    }
    const sliceKey = game.phase === "waiting" ? `w` : `q${game.question_index}`;
    const targetIso = game.phase === "waiting" ? game.waiting_ends_at : game.question_ends_at;
    if (!targetIso) return;

    const remaining = secsLeft(targetIso, timeNow);
    const slot = tickSliceRef.current;

    if (!slot || slot.key !== sliceKey) {
      tickSliceRef.current = { key: sliceKey, remaining };
      return;
    }

    if (remaining < slot.remaining) {
      hydrateAudio();
      const dropped = slot.remaining - remaining;
      const kind = game.phase === "waiting" ? "waiting" : "question";
      const bursts = Math.min(dropped, 5);
      for (let i = 0; i < bursts; i++) {
        window.setTimeout(() => playCountdownTick(kind), i * 72);
      }
      tickSliceRef.current = { key: sliceKey, remaining };
      return;
    }

    if (remaining > slot.remaining) {
      tickSliceRef.current = { key: sliceKey, remaining };
    }
  }, [game, timeNow, hydrateAudio, playCountdownTick]);

  useEffect(() => {
    const keepAmbient =
      joined &&
      game &&
      (game.phase === "waiting" || game.phase === "question" || game.phase === "leaderboard");

    const ctx = ensureSharedCtx();
    if (!keepAmbient || !ctx) {
      ambientCtrlRef.current?.stop();
      return;
    }

    void ctx.resume().catch(() => undefined);
    if (!ambientCtrlRef.current) {
      ambientCtrlRef.current = createQuizAmbient(ctx);
    }
    ambientCtrlRef.current.start();

    return () => {
      ambientCtrlRef.current?.stop();
    };
  }, [ensureSharedCtx, game, joined]);

  useEffect(
    () => () => {
      ambientCtrlRef.current?.dispose();
      ambientCtrlRef.current = null;
      void sharedCtxRef.current?.close().catch(() => undefined);
      sharedCtxRef.current = null;
    },
    [],
  );

  useEffect(() => {
    if (!joined) return;
    const activeQuizId = quizId;
    let cancelled = false;
    let intervalId: number | null = null;
    async function pulse() {
      if (cancelled) return;
      try {
        await runTick(activeQuizId).catch(() => undefined);
        const [g, rankRows] = await Promise.all([fetchGame(activeQuizId), fetchRanks(activeQuizId)]);
        if (!cancelled && rankRows) setRanks(rankRows);
        if (!cancelled && g) {
          setGame(g as GameState);
          if (g.phase === "ended" && intervalId !== null) {
            window.clearInterval(intervalId);
            intervalId = null;
          }
        }
      } catch {
        /* ignore */
      }
    }
    void pulse();
    intervalId = window.setInterval(() => void pulse(), 500);
    return () => {
      cancelled = true;
      if (intervalId !== null) window.clearInterval(intervalId);
    };
  }, [fetchGame, fetchRanks, joined, quizId, runTick]);

  useEffect(() => {
    if (!joined || game?.phase !== "leaderboard") return;
    void fetchRanks(quizId)
      .then(setRanks)
      .catch(() => undefined);
  }, [fetchRanks, game?.phase, joined, quizId]);

  useEffect(() => {
    const signature = ranks.map((r) => `${r.player_key}:${r.score}`).join("|");
    if (prevRanksRef.current && prevRanksRef.current !== signature) {
      playSound("leaderboard");
    }
    prevRanksRef.current = signature;
    const me = ranks.find((r) => r.player_key === selfPlayerKey.current);
    setSelfScore(me?.score ?? 0);
  }, [ranks, playSound]);

  const waitingSeconds = game ? secsLeft(game.waiting_ends_at, timeNow) : 0;
  const questionSeconds = game ? secsLeft(game.question_ends_at, timeNow) : 0;
  const transitionSeconds = game ? secsLeft(game.transition_ends_at, timeNow) : 0;
  const selfRankIndex = ranks.findIndex((r) => r.player_key === selfPlayerKey.current);
  const joinLocked = !!game && game.phase !== "waiting";

  async function joinTournamentRoom() {
    const ign = nameInput.trim();
    if (!ign) {
      setJoinError("Enter username before joining.");
      return;
    }
    hydrateAudio();
    let result: { ok: boolean; message: string } | null = null;
    const scoped = await supabase.rpc("quiz_tournament_join", {
      p_quiz_id: quiz.id,
      p_player_key: selfPlayerKey.current,
      p_in_game_name: ign,
      p_is_simulation: simulation,
      p_scope: roomScope,
    });
    if (!scoped.error) {
      result = (Array.isArray(scoped.data) ? scoped.data[0] : scoped.data) as {
        ok: boolean;
        message: string;
      };
    } else if (!/function .* does not exist|no function matches/i.test(scoped.error.message)) {
      setJoinError(scoped.error.message);
      return;
    }
    if (!result) {
      const legacy = await supabase.rpc("quiz_tournament_join", {
        p_quiz_id: quiz.id,
        p_player_key: selfPlayerKey.current,
        p_in_game_name: ign,
        p_is_simulation: simulation,
        p_scope: roomScope,
      });
      if (legacy.error) {
        if (/Could not choose the best candidate function/i.test(legacy.error.message)) {
          setJoinError("Conflicting quiz_tournament_join overloads — run latest DB migration.");
          return;
        }
        setJoinError(legacy.error.message);
        return;
      }
      result = (Array.isArray(legacy.data) ? legacy.data[0] : legacy.data) as { ok: boolean; message: string };
    }
    if (!result?.ok) {
      setJoinError(result?.message ?? "Unable to join.");
      return;
    }
    setJoinError(null);
    setJoined(true);
    setRanks(await fetchRanks(quiz.id));
    const refreshedGame = await fetchGame(quiz.id);
    if (refreshedGame) setGame(refreshedGame as GameState);
  }

  async function submitAnswer(answerIndex: number) {
    if (!currentQuestion || !game) return;
    if (answeredQuestion === game.question_index) return;
    if (game.phase !== "question") return;
    const responseMs = Math.max(
      0,
      Date.now() - new Date(game.question_started_at ?? new Date().toISOString()).getTime(),
    );
    let result: SubmitAnswerResult | null = null;
    const scoped = await supabase.rpc("quiz_tournament_submit_answer", {
      p_quiz_id: quiz.id,
      p_question_id: currentQuestion.id,
      p_question_index: game.question_index,
      p_player_key: selfPlayerKey.current,
      p_answer_index: answerIndex,
      p_response_ms: responseMs,
      p_time_per_question: quiz.time_per_question_seconds,
      p_scope: roomScope,
    });
    if (!scoped.error) {
      result = (Array.isArray(scoped.data) ? scoped.data[0] : scoped.data) as SubmitAnswerResult;
    } else if (!/function .* does not exist|no function matches/i.test(scoped.error.message)) {
      setAnswerFeedback(scoped.error.message);
      return;
    }
    if (!result) {
      const legacy = await supabase.rpc("quiz_tournament_submit_answer", {
        p_quiz_id: quiz.id,
        p_question_id: currentQuestion.id,
        p_question_index: game.question_index,
        p_player_key: selfPlayerKey.current,
        p_answer_index: answerIndex,
        p_response_ms: responseMs,
        p_time_per_question: quiz.time_per_question_seconds,
        p_scope: roomScope,
      });
      if (legacy.error) {
        setAnswerFeedback(legacy.error.message);
        return;
      }
      result = (Array.isArray(legacy.data) ? legacy.data[0] : legacy.data) as SubmitAnswerResult;
    }
    if (!result?.accepted) {
      setAnswerFeedback(result?.message ?? "Answer rejected.");
      return;
    }
    setAnsweredQuestion(game.question_index);
    setAnswerFeedback(result.is_correct ? `Correct! +${result.points}` : "Wrong answer.");
    setSelfScore(result.score);
    playSound(result.is_correct ? "correct" : "wrong");
    setRanks(await fetchRanks(quiz.id));
  }

  if (!ready) return <p className="text-mist">Opening tournament room…</p>;
  if (initError) return <p className="text-center text-red-400">{initError}</p>;

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="font-display text-2xl text-gold-bright">{quiz.title}</h1>
      <div className="mt-5 grid gap-4 lg:grid-cols-[280px_1fr]">
        <aside className="rounded-2xl border border-gold/25 bg-card/70 p-4">
          <p className="text-xs uppercase tracking-wide text-mist">Live leaderboard</p>
          <ol className="mt-3 space-y-2">
            {ranks.map((r, idx) => (
              <motion.li
                key={`${r.player_key}-${idx}`}
                layout
                transition={{ type: "spring", stiffness: 250, damping: 24 }}
                className="flex items-center justify-between rounded-lg bg-void/45 px-3 py-2"
              >
                <span className={r.player_key === selfPlayerKey.current ? "text-gold-bright" : "text-mist"}>
                  #{idx + 1} {r.in_game_name}
                </span>
                <span className="text-gold-bright">{r.score}</span>
              </motion.li>
            ))}
            {ranks.length === 0 && <li className="text-sm text-mist">Waiting for players…</li>}
          </ol>
        </aside>

        <section className="rounded-2xl border border-gold/25 bg-card/80 p-5">
          {joinError && <p className="mb-3 text-sm text-red-400">{joinError}</p>}

          {!joined && (
            <div className="space-y-3">
              <p className="text-mist">Enter username to join lobby.</p>
              <input
                className="w-full rounded-lg border border-gold/25 bg-void px-3 py-2"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                maxLength={64}
                placeholder="Username"
              />
              <button
                type="button"
                disabled={joinLocked}
                onClick={() => void joinTournamentRoom()}
                className="rounded-xl bg-gold px-4 py-2 text-sm font-semibold text-void disabled:opacity-50"
              >
                {joinLocked ? "Joining locked" : "Join tournament"}
              </button>
              {game?.phase === "waiting" && (
                <p className="text-sm text-mist">Waiting for players... Starts in {waitingSeconds}s</p>
              )}
            </div>
          )}

          {joined && game?.phase === "waiting" && (
            <div className="text-center">
              <p className="text-mist">Waiting for players...</p>
              <p className="mt-2 font-display text-6xl text-gold-bright tabular-nums">{waitingSeconds}</p>
            </div>
          )}

          {joined && game?.phase === "question" && currentQuestion && (
            <div>
              <div className="mb-3 flex items-center justify-between text-sm">
                <span className="text-mist">
                  Question {game.question_index + 1}/{questions.length}
                </span>
                <span className="text-gold-bright tabular-nums">{questionSeconds}s</span>
              </div>
              <p className="text-lg text-foreground">{currentQuestion.question}</p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {currentQuestion.options.slice(0, 4).map((opt, idx) => (
                  <button
                    key={`${currentQuestion.id}-${idx}`}
                    type="button"
                    onClick={() => void submitAnswer(idx)}
                    disabled={answeredQuestion === game.question_index}
                    className="rounded-xl border border-gold/20 bg-void/40 px-3 py-3 text-left text-sm text-mist transition hover:border-gold/40 hover:text-foreground disabled:opacity-60"
                  >
                    <span className="mr-2 text-gold-bright">{String.fromCharCode(65 + idx)}.</span>
                    {opt}
                  </button>
                ))}
              </div>
              {answerFeedback && <p className="mt-3 text-sm text-mist">{answerFeedback}</p>}
              {answeredQuestion === game.question_index && questionSeconds > 0 && (
                <p className="mt-3 text-sm text-gold/90">
                  Answer locked in — everyone advances when the timer ends ({questionSeconds}s).
                </p>
              )}
            </div>
          )}

          {joined && game?.phase === "leaderboard" && (
            <div className="text-center">
              <p className="text-mist">Leaderboard update</p>
              <p className="mt-1 text-3xl text-gold-bright">Your score: {selfScore}</p>
              <p className="mt-2 text-sm text-mist">Next question in {transitionSeconds}s</p>
            </div>
          )}

          {joined && game?.phase === "ended" && (
            <motion.div
              className="relative overflow-hidden rounded-2xl border border-gold/30 bg-gradient-to-b from-gold/[0.08] to-transparent px-4 py-6 text-center shadow-[inset_0_0_40px_rgba(212,175,55,0.06)]"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 280, damping: 26 }}
            >
              <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
                {Array.from({ length: 32 }).map((_, i) => (
                  <motion.span
                    key={`cf-${i}`}
                    className="absolute select-none text-base"
                    style={{ left: `${((i * 71) % 82) + 9}%` }}
                    initial={{
                      top: "-6%",
                      opacity: 0.95,
                      rotate: ((i * 47) % 360) + (i % 2 === 0 ? 0 : 22),
                      scale: 1,
                    }}
                    animate={{
                      top: "110%",
                      opacity: 0,
                      rotate: ((i % 4) + 3) * 88,
                      scale: 1.12 + ((i % 5) / 28),
                    }}
                    transition={{
                      duration: 1.95 + ((i % 7) / 26),
                      delay: i * 0.024,
                      ease: "easeIn",
                    }}
                  >
                    {["🎉", "✨", "🎊", "⭐"][i % 4]}
                  </motion.span>
                ))}
              </div>

              <p className="relative z-[1] text-mist">Final leaderboard</p>
              <p className="relative z-[1] mt-2 text-3xl font-display text-gold-bright md:text-4xl">
                Tournament complete!
              </p>
              <div className="relative z-[1] mt-5 grid grid-cols-3 gap-2 md:gap-3">
                {[0, 1, 2].map((idx) => {
                  const r = ranks[idx];
                  return (
                    <motion.div
                      key={`pod-${idx}`}
                      className="rounded-xl border border-gold/40 bg-void/55 px-2 py-4 shadow-[0_0_24px_rgba(212,175,55,0.12)]"
                      initial={{ opacity: 0, y: 36, scale: 0.88 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{
                        type: "spring",
                        stiffness: 420,
                        damping: 24,
                        delay: 0.12 + idx * 0.16,
                      }}
                    >
                      <motion.p
                        className="text-2xl md:text-3xl"
                        animate={{ y: [0, -4, 0] }}
                        transition={{
                          duration: 1.6,
                          repeat: Infinity,
                          repeatType: "reverse",
                          delay: idx * 0.2,
                        }}
                      >
                        {idx === 0 ? "🥇" : idx === 1 ? "🥈" : "🥉"}
                      </motion.p>
                      <p className="truncate text-sm font-medium text-gold-bright md:text-base">
                        {r?.in_game_name ?? "--"}
                      </p>
                      <p className="text-xs text-mist md:text-sm">{r?.score ?? 0} pts</p>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          <p className="mt-5 text-xs text-mist/90">
            Rank: {selfRankIndex >= 0 ? `#${selfRankIndex + 1}` : "--"} | No re-entry after start.
          </p>
        </section>
      </div>
    </div>
  );
}
