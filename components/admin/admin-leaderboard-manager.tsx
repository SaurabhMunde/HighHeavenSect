"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui";

type Row = { id: string; name: string; amount: string | number };

export function LeaderboardManager() {
  const supabase = createClient();
  const [rows, setRows] = useState<Row[]>([]);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState(0);
  const [editing, setEditing] = useState<Row | null>(null);

  async function load() {
    const { data } = await supabase
      .from("member_contributions")
      .select("id, name, amount")
      .order("amount", { ascending: false });
    if (data) setRows(data as Row[]);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (editing) {
      await supabase
        .from("member_contributions")
        .update({ name, amount })
        .eq("id", editing.id);
    } else {
      await supabase.from("member_contributions").insert({ name, amount });
    }
    setName("");
    setAmount(0);
    setEditing(null);
    load();
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <Card className="!p-5">
        <h2 className="font-display text-lg text-gold">
          {editing ? "Edit entry" : "Add member"}
        </h2>
        <form onSubmit={save} className="mt-3 space-y-2">
          <input
            required
            placeholder="In-game or display name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-gold/25 bg-void/80 px-3 py-2 text-sm"
          />
          <input
            type="number"
            min={0}
            step="0.01"
            required
            value={amount}
            onChange={(e) => setAmount(+e.target.value)}
            className="w-full rounded-lg border border-gold/25 bg-void/80 px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-xl bg-gold px-4 py-2 text-sm font-semibold text-void"
            >
              {editing ? "Update" : "Add / upsert by name*"}
            </button>
            {editing && (
              <button
                type="button"
                onClick={() => {
                  setEditing(null);
                  setName("");
                  setAmount(0);
                }}
                className="rounded-xl border border-gold/30 px-4 py-2 text-sm"
              >
                Cancel
              </button>
            )}
          </div>
          <p className="text-xs text-mist">
            * New rows are inserts. For duplicate names, edit the existing line.
          </p>
        </form>
      </Card>
      <div className="space-y-2">
        {rows.map((r, i) => (
          <Card key={r.id} className="!py-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <span className="text-mist">#{i + 1} </span>
                <span className="text-foreground">{r.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gold-bright tabular-nums">
                  {Number(r.amount).toLocaleString()}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(r);
                    setName(r.name);
                    setAmount(Number(r.amount));
                  }}
                  className="text-xs text-gold"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!confirm("Remove?")) return;
                    await supabase.from("member_contributions").delete().eq("id", r.id);
                    load();
                  }}
                  className="text-xs text-red-400"
                >
                  Del
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
