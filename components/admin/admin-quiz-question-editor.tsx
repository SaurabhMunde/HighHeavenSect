"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { computeClosesAtIso } from "@/lib/quiz-times";
import { statusLabel } from "@/lib/quiz-meta";
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
  const [quizStatus, setQuizStatus] = useState<string>("draft");
  const [q, setQ] = useState("");
  const [opts, setOpts] = useState("A\nB\nC\nD");
  const [correct, setCorrect] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQ, setEditQ] = useState("");
  const [editOpts, setEditOpts] = useState("");
  const [editCorrect, setEditCorrect] = useState(0);

  const canEdit = quizStatus === "draft";

  async function syncClosesNow(count: number) {
    const { data: meta } = await supabase
      .from("quizzes")
      .select("opens_at, scheduled_at, closes_at, time_limit_seconds, time_per_question_seconds, quiz_type")
      .eq("id", quizId)
      .single();
    if (!meta) return;
    if ((meta as { quiz_type?: string }).quiz_type === "tournament") return;
    // Respect admin-set end windows. Only auto-compute close time when missing.
    if (meta.closes_at) return;
    const o = meta.opens_at || meta.scheduled_at;
    if (!o || count < 1) return;
    const perQ =
      (meta as { time_per_question_seconds?: number | null }).time_per_question_seconds ??
      meta.time_limit_seconds ??
      20;
    const closes = computeClosesAtIso(o, perQ, count);
    if (closes) {
      await supabase
        .from("quizzes")
        .update({ closes_at: closes, opens_at: o, scheduled_at: meta.scheduled_at || o })
        .eq("id", quizId);
    }
  }

  async function load() {
    const { data: meta } = await supabase
      .from("quizzes")
      .select("status")
      .eq("id", quizId)
      .single();
    if (meta?.status) {
      setQuizStatus(meta.status);
    }
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
    if (!canEdit) return;
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
    if (!canEdit) return;
    if (!confirm("Remove this question?")) return;
    await supabase.from("quiz_questions").delete().eq("id", id);
    load();
  }

  function openEdit(row: Q) {
    if (!canEdit) return;
    setEditingId(row.id);
    setEditQ(row.question);
    setEditOpts(row.options.join("\n"));
    setEditCorrect(row.correct_index);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditQ("");
    setEditOpts("");
    setEditCorrect(0);
  }

  async function saveEdit(rowId: string) {
    if (!canEdit) return;
    const options = editOpts
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    if (options.length < 2) {
      alert("Need at least 2 options (one per line).");
      return;
    }
    if (editCorrect < 0 || editCorrect >= options.length) {
      alert("Correct index out of range (0 = first line).");
      return;
    }
    await supabase
      .from("quiz_questions")
      .update({
        question: editQ,
        options,
        correct_index: editCorrect,
      })
      .eq("id", rowId)
      .eq("quiz_id", quizId);
    cancelEdit();
    await load();
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <Card className="!p-5">
        <h2 className="font-display text-lg text-gold">Add question</h2>
        {!canEdit && (
          <p className="mt-2 text-xs text-mist" title="Editing is only allowed in draft mode">
            Editing is disabled. Current status: {quizStatus} ({statusLabel(quizStatus)}).
          </p>
        )}
        <form onSubmit={add} className="mt-3 space-y-2">
          <textarea
            required
            placeholder="Question"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            disabled={!canEdit}
            title={!canEdit ? "Editing is only allowed in draft mode" : undefined}
            className="min-h-[72px] w-full rounded-lg border border-gold/25 bg-void/80 px-3 py-2 text-sm"
          />
          <p className="text-xs text-mist">Options: one per line</p>
          <textarea
            value={opts}
            onChange={(e) => setOpts(e.target.value)}
            disabled={!canEdit}
            title={!canEdit ? "Editing is only allowed in draft mode" : undefined}
            className="min-h-[100px] w-full rounded-lg border border-gold/25 bg-void/80 px-3 py-2 text-sm"
          />
          <div className="flex items-center gap-2">
            <label className="text-xs text-mist">Correct line # (0-based)</label>
            <input
              type="number"
              min={0}
              value={correct}
              onChange={(e) => setCorrect(+e.target.value)}
              disabled={!canEdit}
              title={!canEdit ? "Editing is only allowed in draft mode" : undefined}
              className="w-20 rounded-lg border border-gold/25 bg-void/80 px-2 py-1 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={!canEdit}
            title={!canEdit ? "Editing is only allowed in draft mode" : undefined}
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
            {editingId === row.id ? (
              <div className="space-y-2">
                <textarea
                  value={editQ}
                  onChange={(e) => setEditQ(e.target.value)}
                  className="min-h-[72px] w-full rounded-lg border border-gold/25 bg-void/80 px-3 py-2 text-sm"
                />
                <p className="text-xs text-mist">Options: one per line</p>
                <textarea
                  value={editOpts}
                  onChange={(e) => setEditOpts(e.target.value)}
                  className="min-h-[100px] w-full rounded-lg border border-gold/25 bg-void/80 px-3 py-2 text-sm"
                />
                <div className="flex items-center gap-2">
                  <label className="text-xs text-mist">Correct line # (0-based)</label>
                  <input
                    type="number"
                    min={0}
                    value={editCorrect}
                    onChange={(e) => setEditCorrect(+e.target.value)}
                    className="w-20 rounded-lg border border-gold/25 bg-void/80 px-2 py-1 text-sm"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => saveEdit(row.id)}
                    className="rounded-lg border border-gold/30 px-3 py-1.5 text-xs text-gold"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="rounded-lg border border-gold/20 px-3 py-1.5 text-xs text-mist"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
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
                <div className="mt-2 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => openEdit(row)}
                    disabled={!canEdit}
                    title={!canEdit ? "Editing is only allowed in draft mode" : undefined}
                    className="text-xs text-gold hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => del(row.id)}
                    disabled={!canEdit}
                    title={!canEdit ? "Editing is only allowed in draft mode" : undefined}
                    className="text-xs text-red-400 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
