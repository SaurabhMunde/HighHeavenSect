"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { logGuildAction } from "@/lib/guild-log";
import { Card } from "@/components/ui-card";

type EventRow = {
  id: string;
  title: string;
  description: string;
  event_date: string;
  event_time: string | null;
  host: string;
};

export function EventsManager() {
  const supabase = createClient();
  const [rows, setRows] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    title: "",
    description: "",
    event_date: "",
    event_time: "",
    host: "",
  });
  const [editing, setEditing] = useState<EventRow | null>(null);

  async function load() {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("event_date", { ascending: true });
    if (!error && data) setRows(data as EventRow[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      title: form.title,
      description: form.description,
      event_date: form.event_date,
      event_time: form.event_time || null,
      host: form.host,
    };
    const { data: u } = await supabase.auth.getUser();
    const who = u.user?.email ?? "Officer";
    if (editing) {
      await supabase.from("events").update(payload).eq("id", editing.id);
      await logGuildAction(supabase, `${who} updated event “${form.title}”.`);
    } else {
      await supabase.from("events").insert(payload);
      await logGuildAction(supabase, `${who} added event “${form.title}” for ${form.event_date}.`);
    }
    setForm({ title: "", description: "", event_date: "", event_time: "", host: "" });
    setEditing(null);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this event?")) return;
    const row = rows.find((r) => r.id === id);
    await supabase.from("events").delete().eq("id", id);
    const { data: u } = await supabase.auth.getUser();
    const who = u.user?.email ?? "Officer";
    if (row) await logGuildAction(supabase, `${who} removed event “${row.title}”.`);
    load();
  }

  function startEdit(r: EventRow) {
    setEditing(r);
    setForm({
      title: r.title,
      description: r.description,
      event_date: r.event_date,
      event_time: r.event_time ?? "",
      host: r.host,
    });
  }

  if (loading) {
    return <p className="text-mist">Loading…</p>;
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <Card className="!p-6">
        <h2 className="font-display text-lg text-gold">
          {editing ? "Edit event" : "New event"}
        </h2>
        <p className="mt-1 text-xs text-mist">
          Enter the calendar <strong className="text-foreground/90">date and clock time in UTC+5:30
          (IST, Asia/Kolkata)</strong>—our single reference for in-game / guild time (SEA). The
          public site shows this to each member in <strong className="text-foreground/90">their
          </strong> local time zone.
        </p>
        <form onSubmit={save} className="mt-4 space-y-3">
          <input
            required
            placeholder="Title"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            className="w-full rounded-lg border border-gold/25 bg-void/80 px-3 py-2 text-sm"
          />
          <textarea
            placeholder="Description"
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
            className="min-h-[88px] w-full rounded-lg border border-gold/25 bg-void/80 px-3 py-2 text-sm"
          />
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              type="date"
              required
              value={form.event_date}
              onChange={(e) =>
                setForm((f) => ({ ...f, event_date: e.target.value }))
              }
              className="rounded-lg border border-gold/25 bg-void/80 px-3 py-2 text-sm"
            />
            <input
              type="time"
              value={form.event_time}
              onChange={(e) =>
                setForm((f) => ({ ...f, event_time: e.target.value }))
              }
              className="rounded-lg border border-gold/25 bg-void/80 px-3 py-2 text-sm"
            />
          </div>
          <input
            placeholder="Host"
            value={form.host}
            onChange={(e) => setForm((f) => ({ ...f, host: e.target.value }))}
            className="w-full rounded-lg border border-gold/25 bg-void/80 px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-xl bg-gold px-4 py-2 text-sm font-semibold text-void"
            >
              {editing ? "Update" : "Add"}
            </button>
            {editing && (
              <button
                type="button"
                onClick={() => {
                  setEditing(null);
                  setForm({
                    title: "",
                    description: "",
                    event_date: "",
                    event_time: "",
                    host: "",
                  });
                }}
                className="rounded-xl border border-gold/30 px-4 py-2 text-sm text-mist"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </Card>
      <div className="space-y-2">
        {rows.length === 0 && (
          <p className="text-mist">No events yet. Add your first on the left.</p>
        )}
        {rows.map((r) => (
          <Card key={r.id} className="!py-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-medium text-foreground">{r.title}</h3>
                <p className="text-xs text-mist">
                  {r.event_date}
                  {r.event_time ? ` · ${r.event_time}` : ""} · {r.host}
                </p>
                <p className="mt-1 text-sm text-mist/90">{r.description}</p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => startEdit(r)}
                  className="text-xs text-gold hover:underline"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => remove(r.id)}
                  className="text-xs text-red-400 hover:underline"
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
