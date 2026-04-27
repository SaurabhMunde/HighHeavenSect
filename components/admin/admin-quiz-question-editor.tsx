"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { computeClosesAtIso } from "@/lib/quiz-times";
import { Card } from "@/components/ui";

type Q = {
  id: string;
  question: string;
  options: string[];
  correct_index: number;
  sort_order: number;
};

export function QuizQuestionEditor({ quizId }: { quizId: string }) {
  const supabase = createClient();
  const [list, setList] = useState<Q[]>([]);
  const [q, setQ] = useState("");
  const [opts, setOpts] = useState("A\nB\nC\nD");
  const [correct, setCorrect] = useState(0);

  async function syncClosesNow(count: number) {
    const { data: meta } = await supabase
      .from("quizzes")
      .select("opens_at, scheduled_at, time_limit_seconds")
      .eq("id", quizId)
      .single();
    if (!meta) return;
    const o = meta.opens_at || meta.scheduled_at;
    if (!o || count < 1) return;
    const closes = computeClosesAtIso(
      o,
      meta.time_limit_seconds,
      count,
    );
    if (closes) {
      await supabase
        .from("quizzes")
        .update({ closes_at: closes, opens_at: o, scheduled_at: meta.scheduled_at || o })
        .eq("id", quizId);
    }
  }

  async function load() {
    const { data } = await supabase
      .from("quiz_questions")
      .select("*")
      .eq("quiz_id", quizId)
      .order("sort_order", { ascending: true });
    if (data) {
      const arr = (data as { options: string[] }[]).map((r) => ({
        ...r,
        options: Array.isArray(r.options) ? (r.options as string[]) : [],
      })) as Q[];
      setList(arr);
      void syncClosesNow(arr.length);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizId]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const options = opts
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    if (options.length < 2) {
      alert("Need at least 2 options (one per line).");
      return;
    }
    if (correct < 0 || correct >= options.length) {
      alert("Correct index out of range (0 = first line).");
      return;
    }
    await supabase.from("quiz_questions").insert({
      quiz_id: quizId,
      question: q,
      options,
      correct_index: correct,
      sort_order: list.length,
    });
    setQ("");
    setOpts("A\nB\nC\nD");
    setCorrect(0);
    await load();
  }

  async function del(id: string) {
    if (!confirm("Remove this question?")) return;
    await supabase.from("quiz_questions").delete().eq("id", id);
    load();
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <Card className="!p-5">
        <h2 className="font-display text-lg text-gold">Add question</h2>
        <form onSubmit={add} className="mt-3 space-y-2">
          <textarea
            required
            placeholder="Question"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="min-h-[72px] w-full rounded-lg border border-gold/25 bg-void/80 px-3 py-2 text-sm"
          />
          <p className="text-xs text-mist">Options: one per line</p>
          <textarea
            value={opts}
            onChange={(e) => setOpts(e.target.value)}
            className="min-h-[100px] w-full rounded-lg border border-gold/25 bg-void/80 px-3 py-2 text-sm"
          />
          <div className="flex items-center gap-2">
            <label className="text-xs text-mist">Correct line # (0-based)</label>
            <input
              type="number"
              min={0}
              value={correct}
              onChange={(e) => setCorrect(+e.target.value)}
              className="w-20 rounded-lg border border-gold/25 bg-void/80 px-2 py-1 text-sm"
            />
          </div>
          <button
            type="submit"
            className="rounded-xl bg-gold px-4 py-2 text-sm font-semibold text-void"
          >
            Add question
          </button>
        </form>
      </Card>
      <ol className="list-decimal space-y-2 pl-4">
        {list.length === 0 && <p className="text-mist">No questions yet.</p>}
        {list.map((row) => (
          <li key={row.id} className="rounded-lg border border-gold/15 bg-card/60 p-3">
            <p className="text-sm text-foreground">{row.question}</p>
            <ul className="mt-1 list-inside list-disc text-xs text-mist">
              {row.options.map((o, i) => (
                <li
                  key={i}
                  className={
                    i === row.correct_index ? "text-gold-bright" : undefined
                  }
                >
                  {o}
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => del(row.id)}
              className="mt-2 text-xs text-red-400 hover:underline"
            >
              Remove
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
