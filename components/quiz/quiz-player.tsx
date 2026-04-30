"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { TournamentQuizRoom } from "./tournament-quiz-room";
import { QuizTrialPlayer } from "./quiz-trial-player";

type LoadedQuiz =
  | {
      kind: "tournament";
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
        correct_index: number;
      }>;
    }
  | {
      kind: "trial";
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
    };

export function QuizPlayer({ code, simulation = false }: { code: string; simulation?: boolean }) {
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bundle, setBundle] = useState<LoadedQuiz | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setError(null);
      setLoading(true);
      try {
        const normalized = code.trim().toLowerCase();
        const { data: qz, error: quizErr } = await supabase
          .from("quizzes")
          .select(
            "id, title, quiz_type, status, start_time, waiting_time_seconds, time_per_question_seconds, time_limit_seconds, opens_at, scheduled_at, closes_at",
          )
          .ilike("join_code", normalized)
          .maybeSingle();
        if (cancelled) return;
        if (quizErr || !qz) {
          setError("Quiz not found.");
          setBundle(null);
          setLoading(false);
          return;
        }

        if (qz.status === "simulation" && !simulation) {
          setError("This quiz is in simulation mode (admin only). Open it from the admin simulation page.");
          setBundle(null);
          setLoading(false);
          return;
        }

        const { data: qs, error: qErr } = await supabase
          .from("quiz_questions")
          .select("id, question, options, sort_order, correct_index")
          .eq("quiz_id", qz.id)
          .order("sort_order", { ascending: true });
        if (qErr) throw qErr;
        type QRow = {
          id: string;
          question: string;
          options: string[];
          sort_order: number;
          correct_index: number;
        };
        const questions = ((qs ?? []) as {
          id: string;
          question: string;
          options: unknown;
          sort_order: number;
          correct_index: number;
        }[]).map<QRow>((row) => ({
          id: row.id,
          question: row.question,
          options: Array.isArray(row.options) ? (row.options as string[]) : [],
          sort_order: row.sort_order,
          correct_index: typeof row.correct_index === "number" ? row.correct_index : 0,
        }));

        if (qz.quiz_type === "tournament") {
          setBundle({
            kind: "tournament",
            quiz: {
              id: qz.id,
              title: qz.title,
              quiz_type: "tournament",
              status: qz.status,
              start_time: qz.start_time,
              waiting_time_seconds: qz.waiting_time_seconds ?? 30,
              time_per_question_seconds: qz.time_per_question_seconds ?? qz.time_limit_seconds ?? 20,
            },
            questions,
          });
        } else {
          const startFallback =
            typeof qz.start_time === "string" ? (qz.start_time as string) : null;
          const opensMerged = qz.opens_at ?? qz.scheduled_at ?? startFallback;
          const scheduledMerged = qz.scheduled_at ?? startFallback;
          setBundle({
            kind: "trial",
            quiz: {
              id: qz.id,
              title: qz.title,
              quiz_type: "trial",
              status: qz.status,
              scheduled_at: scheduledMerged,
              opens_at: opensMerged,
              closes_at: qz.closes_at,
              time_per_question_seconds: qz.time_per_question_seconds,
              time_limit_seconds: qz.time_limit_seconds,
            },
            questions,
          });
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load quiz.");
        setBundle(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code, simulation, supabase]);

  if (loading) return <p className="text-mist">Opening quiz room…</p>;
  if (error) return <p className="text-center text-red-400">{error}</p>;
  if (!bundle) return <p className="text-mist">Quiz not available.</p>;

  if (bundle.kind === "tournament") {
    return <TournamentQuizRoom quiz={bundle.quiz} questions={bundle.questions} simulation={simulation} />;
  }
  return <QuizTrialPlayer quiz={bundle.quiz} questions={bundle.questions} simulation={simulation} />;
}
