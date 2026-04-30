"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { logGuildAction } from "@/lib/guild-log";
import { QUIZ_STATUSES, QUIZ_TYPES, statusLabel } from "@/lib/quiz-meta";
import { Card } from "@/components/ui";

type Quiz = {
  id: string;
  title: string;
  time_per_question_seconds: number;
  quiz_type: "trial" | "tournament";
  waiting_time_seconds: number;
  join_code: string;
  start_time: string | null;
  closes_at: string | null;
  status: string;
};

export function QuizList() {
  const supabase = createClient();
  const [rows, setRows] = useState<Quiz[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [timePerQuestion, setTimePerQuestion] = useState(20);
  const [quizType, setQuizType] = useState<"trial" | "tournament">("trial");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [waitingTime, setWaitingTime] = useState(30);

  async function load() {
    setActionError(null);
    const { data } = await supabase
      .from("quizzes")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setRows(data as Quiz[]);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createQuiz(e: React.FormEvent) {
    e.preventDefault();
    if (quizType === "trial" && (!startAt || !endAt)) {
      alert("Sect Trial needs both a start time and an end time (attempt window closes at end).");
      return;
    }
    const start = startAt ? new Date(startAt).toISOString() : null;
    let closesAt: string | null = null;
    if (quizType === "trial" && endAt) {
      let closeDate = new Date(endAt);
      const openDate = start ? new Date(start) : null;
      if (openDate && closeDate.getTime() <= openDate.getTime()) {
        closeDate = new Date(openDate.getTime() + 60_000);
      }
      closesAt = closeDate.toISOString();
    }
    const { data: authData } = await supabase.auth.getUser();
    const { error } = await supabase.from("quizzes").insert({
      title,
      time_limit_seconds: timePerQuestion,
      time_per_question_seconds: timePerQuestion,
      quiz_type: quizType,
      waiting_time_seconds: waitingTime,
      start_time: start,
      scheduled_at: start,
      opens_at: start,
      closes_at: quizType === "trial" ? closesAt : null,
      status: "draft",
    });
    if (!error) {
      const who = authData.user?.email ?? "An officer";
      const closeNote =
        quizType === "trial" && closesAt ? ` closes ${new Date(closesAt).toLocaleString()}` : "";
      await logGuildAction(
        supabase,
        `${who} created quiz “${title}”${start ? " (starts " + new Date(start).toLocaleString() + ", local)" : ""}${closeNote}.`,
      );
    } else {
      setActionError(error.message);
      alert(`Create failed: ${error.message}`);
    }
    setTitle("");
    setQuizType("trial");
    setStartAt("");
    setEndAt("");
    setWaitingTime(30);
    load();
  }

  return (
    <div className="space-y-6">
      <Card className="!p-5">
        <h2 className="font-display text-lg text-gold">New quiz</h2>
        <form onSubmit={createQuiz} className="mt-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <input
            required
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="min-w-[200px] flex-1 rounded-lg border border-gold/25 bg-void/80 px-3 py-2 text-sm"
          />
          <div className="flex items-center gap-2">
            <label className="text-xs text-mist">Sec/q</label>
            <input
              type="number"
              min={5}
              max={120}
              value={timePerQuestion}
              onChange={(e) => setTimePerQuestion(+e.target.value)}
              className="w-20 rounded-lg border border-gold/25 bg-void/80 px-2 py-2 text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-mist">Type</label>
            <select
              value={quizType}
              onChange={(e) => setQuizType(e.target.value as "trial" | "tournament")}
              className="rounded-lg border border-gold/25 bg-void/80 px-2 py-2 text-sm"
            >
              <option value="trial">Sect Trial</option>
              <option value="tournament">Heavenly Tournament</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-mist">Start time</label>
            <input
              type="datetime-local"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              className="rounded-lg border border-gold/25 bg-void/80 px-2 py-2 text-sm"
            />
          </div>
          {quizType === "trial" && (
            <div className="flex items-center gap-2">
              <label className="text-xs text-mist">End time</label>
              <input
                type="datetime-local"
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
                className="rounded-lg border border-gold/25 bg-void/80 px-2 py-2 text-sm"
              />
            </div>
          )}
          {quizType === "tournament" && (
            <div className="flex items-center gap-2">
              <label className="text-xs text-mist">Waiting time (sec)</label>
              <input
                type="number"
                min={5}
                max={120}
                value={waitingTime}
                onChange={(e) => setWaitingTime(+e.target.value)}
                className="w-20 rounded-lg border border-gold/25 bg-void/80 px-2 py-2 text-sm"
              />
            </div>
          )}
          <button
            type="submit"
            className="rounded-xl bg-gold px-4 py-2 text-sm font-semibold text-void"
          >
            Create
          </button>
        </form>
      </Card>
      <div className="space-y-2">
        {actionError && (
          <p className="text-sm text-red-400">Quiz action failed: {actionError}</p>
        )}
        {rows.length === 0 && <p className="text-mist">No quizzes yet.</p>}
        {rows.map((q) => (
          <Card key={q.id} className="!py-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-medium text-foreground">{q.title}</h3>
                <p className="text-xs text-mist">
                  {q.quiz_type === "tournament" ? "Heavenly Tournament" : "Sect Trial"} · {q.time_per_question_seconds}s per question · status: {q.status} ({statusLabel(q.status)})
                  {q.start_time ? ` · starts ${new Date(q.start_time).toLocaleString()} (local on device when viewing public pages)` : ""}
                  {q.quiz_type === "trial" && q.closes_at
                    ? ` · closes ${new Date(q.closes_at).toLocaleString()} (local)`
                    : ""}
                  {q.quiz_type === "tournament" ? ` · waiting ${q.waiting_time_seconds}s` : ""}
                </p>
                <a
                  href={`/quiz/${q.join_code}`}
                  className="mt-1 inline-block text-xs text-gold hover:underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  /quiz/{q.join_code}
                </a>
              </div>
              <div className="flex gap-2">
                <Link
                  href={`/admin/quiz/${q.id}`}
                  className={`rounded-lg border border-gold/30 px-3 py-1.5 text-sm ${
                    q.status === "draft" ? "text-gold" : "pointer-events-none text-mist/60"
                  }`}
                  title={q.status === "draft" ? undefined : "Editing is only allowed in draft mode"}
                >
                  Edit questions
                </Link>
                <button
                  type="button"
                  onClick={async () => {
                    const { error } = await supabase
                      .from("quizzes")
                      .update({ status: "simulation" })
                      .eq("id", q.id);
                    if (error) {
                      setActionError(error.message);
                      alert(`Move to Simulation failed: ${error.message}`);
                      return;
                    }
                    await load();
                  }}
                  className="rounded-lg border border-gold/30 px-3 py-1.5 text-sm text-gold"
                >
                  Move to Simulation
                </button>
                <select
                  value={q.status}
                  onChange={async (e) => {
                    const { error } = await supabase
                      .from("quizzes")
                      .update({ status: e.target.value })
                      .eq("id", q.id);
                    if (error) {
                      setActionError(error.message);
                      alert(`Status update failed: ${error.message}`);
                      return;
                    }
                    load();
                  }}
                  className="rounded-lg border border-gold/25 bg-void px-2 py-1.5 text-sm"
                >
                  {QUIZ_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <select
                  value={q.quiz_type}
                  onChange={async (e) => {
                    const next = e.target.value as (typeof QUIZ_TYPES)[number];
                    const { error } = await supabase
                      .from("quizzes")
                      .update({ quiz_type: next })
                      .eq("id", q.id);
                    if (error) {
                      setActionError(error.message);
                      alert(`Quiz type update failed: ${error.message}`);
                      return;
                    }
                    await load();
                  }}
                  className="rounded-lg border border-gold/25 bg-void px-2 py-1.5 text-sm"
                >
                  <option value="trial">Sect Trial</option>
                  <option value="tournament">Heavenly Tournament</option>
                </select>
                <button
                  type="button"
                  onClick={async () => {
                    if (!confirm("Delete quiz?")) return;
                    await supabase.from("quizzes").delete().eq("id", q.id);
                    load();
                  }}
                  className="text-sm text-red-400"
                >
                  Delete
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
