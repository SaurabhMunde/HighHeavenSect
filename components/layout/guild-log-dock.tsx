"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { hasSupabase } from "@/lib/env";

type Row = { id: string; message: string; created_at: string; kind: string };

export function GuildLogDock() {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!hasSupabase()) {
      setLoading(false);
      return;
    }
    const s = createClient();
    const { data, error } = await s
      .from("guild_logs")
      .select("id, message, kind, created_at")
      .order("created_at", { ascending: false })
      .limit(80);
    if (error) {
      setRows([]);
    } else if (data) {
      setRows(data as Row[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [load]);

  if (!hasSupabase()) return null;

  return (
    <div className="pointer-events-auto fixed bottom-4 right-4 z-[100] max-w-sm">
      {open && (
        <div className="mb-2 max-h-[50vh] overflow-y-auto rounded-2xl border border-gold/25 bg-void/95 p-3 shadow-2xl backdrop-blur-md">
          <p className="mb-2 font-display text-sm text-gold-bright">Sect log</p>
          {loading && <p className="text-xs text-mist">Loading…</p>}
          {!loading && rows.length === 0 && (
            <p className="text-xs text-mist">No entries yet. Officers actions will show here after running the new database migration.</p>
          )}
          <ul className="space-y-2 text-xs text-mist">
            {rows.map((r) => (
              <li key={r.id} className="border-b border-gold/10 pb-1 last:border-0">
                <span className="text-mist/70">
                  {new Date(r.created_at).toLocaleString()}
                </span>
                <br />
                {r.message}
              </li>
            ))}
          </ul>
        </div>
      )}
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          if (!open) void load();
        }}
        className="pointer-events-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full border-2 border-gold/50 bg-void/90 p-0 text-sm font-medium text-gold-bright shadow-lg backdrop-blur transition hover:border-gold hover:bg-card/90"
        aria-expanded={open}
        aria-label={open ? "Close log" : "Open log"}
      >
        {open ? "×" : "Log"}
      </button>
    </div>
  );
}
