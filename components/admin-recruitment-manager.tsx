"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { logGuildAction } from "@/lib/guild-log";
import { Card } from "@/components/ui-card";

type R = {
  id: string;
  recruiter: string;
  recruited: string;
  joined_at: string;
  last_active: string | null;
  active_within_5_days: boolean;
};

export function RecruitmentManager() {
  const supabase = createClient();
  const [rows, setRows] = useState<R[]>([]);
  const [form, setForm] = useState({
    recruiter: "",
    recruited: "",
    joined_at: new Date().toISOString().slice(0, 10),
    last_active: "",
    active_within_5_days: true,
  });

  async function load() {
    const { data } = await supabase
      .from("recruitments")
      .select("*")
      .order("joined_at", { ascending: false });
    if (data) setRows(data as R[]);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ranks = useMemo(() => {
    const m = new Map<string, { count: number; active: number }>();
    for (const r of rows) {
      const k = r.recruiter;
      if (!m.has(k)) m.set(k, { count: 0, active: 0 });
      const o = m.get(k)!;
      o.count += 1;
      if (r.active_within_5_days) o.active += 1;
    }
    return [...m.entries()]
      .map(([recruiter, v]) => ({ recruiter, ...v }))
      .sort((a, b) => b.active - a.active || b.count - a.count);
  }, [rows]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    await supabase.from("recruitments").insert({
      recruiter: form.recruiter,
      recruited: form.recruited,
      joined_at: form.joined_at,
      last_active: form.last_active || null,
      active_within_5_days: form.active_within_5_days,
    });
    const { data: u } = await supabase.auth.getUser();
    const who = u.user?.email ?? "Officer";
    await logGuildAction(
      supabase,
      `${who} logged recruitment: ${form.recruited} (recruited by ${form.recruiter}).`,
    );
    setForm({
      recruiter: "",
      recruited: "",
      joined_at: new Date().toISOString().slice(0, 10),
      last_active: "",
      active_within_5_days: true,
    });
    load();
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="!p-5">
          <h2 className="font-display text-lg text-gold">Add record</h2>
          <form onSubmit={add} className="mt-3 space-y-2 text-sm">
            <input
              required
              className="w-full rounded-lg border border-gold/25 bg-void/80 px-2 py-2"
              placeholder="Recruiter (Discord or IGN)"
              value={form.recruiter}
              onChange={(e) => setForm((f) => ({ ...f, recruiter: e.target.value }))}
            />
            <input
              required
              className="w-full rounded-lg border border-gold/25 bg-void/80 px-2 py-2"
              placeholder="Recruited member"
              value={form.recruited}
              onChange={(e) => setForm((f) => ({ ...f, recruited: e.target.value }))}
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                className="rounded-lg border border-gold/25 bg-void/80 px-2 py-2"
                value={form.joined_at}
                onChange={(e) => setForm((f) => ({ ...f, joined_at: e.target.value }))}
              />
              <input
                type="date"
                className="rounded-lg border border-gold/25 bg-void/80 px-2 py-2"
                value={form.last_active}
                onChange={(e) => setForm((f) => ({ ...f, last_active: e.target.value }))}
              />
            </div>
            <label className="flex items-center gap-2 text-mist">
              <input
                type="checkbox"
                checked={form.active_within_5_days}
                onChange={(e) =>
                  setForm((f) => ({ ...f, active_within_5_days: e.target.checked }))
                }
              />
              Active within 5 days (rule)
            </label>
            <button
              type="submit"
              className="rounded-xl bg-gold px-4 py-2 font-semibold text-void"
            >
              Save
            </button>
          </form>
        </Card>
        <Card className="!p-5">
          <h2 className="font-display text-lg text-gold">Top recruiters</h2>
          <ol className="mt-2 list-decimal pl-4 text-sm">
            {ranks.length === 0 && <p className="text-mist">No data yet.</p>}
            {ranks.map((r) => (
              <li key={r.recruiter} className="py-0.5 text-mist">
                <span className="text-foreground">{r.recruiter}</span> · {r.active}{" "}
                active / {r.count} total
              </li>
            ))}
          </ol>
        </Card>
      </div>
      <div className="space-y-2">
        {rows.map((r) => (
          <Card key={r.id} className="!py-3">
            <div className="flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className="text-foreground">{r.recruited}</span>
                <span className="text-mist"> · by </span>
                <span className="text-gold/90">{r.recruiter}</span>
              </div>
              <div className="text-xs text-mist">
                joined {r.joined_at}
                {r.last_active ? ` · last active ${r.last_active}` : ""} ·{" "}
                {r.active_within_5_days ? "passes 5d rule" : "outside window"}
              </div>
              <button
                type="button"
                onClick={async () => {
                  if (!confirm("Delete row?")) return;
                  await supabase.from("recruitments").delete().eq("id", r.id);
                  load();
                }}
                className="text-xs text-red-400"
              >
                Delete
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
