"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { logGuildAction } from "@/lib/guild-log";
import { Card } from "@/components/ui-card";

type G = {
  id: string;
  title: string;
  reward: string;
  status: string;
  signup_ends_at: string | null;
};

type Entry = { id: string; member_name: string };
type W = { id: string; winner_name: string };

export function GiveawaysManager() {
  const supabase = createClient();
  const [list, setList] = useState<G[]>([]);
  const [title, setTitle] = useState("");
  const [reward, setReward] = useState("60 pearls");
  const [selected, setSelected] = useState<string | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [winners, setWinners] = useState<W[]>([]);
  const [entryName, setEntryName] = useState("");
  const [signupEnds, setSignupEnds] = useState("");
  const [publicSignups, setPublicSignups] = useState<{ in_game_name: string }[]>([]);

  async function loadG() {
    const { data } = await supabase
      .from("giveaways")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setList(data as G[]);
  }

  useEffect(() => {
    loadG();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selected) {
      setEntries([]);
      setWinners([]);
      return;
    }
    (async () => {
      const s = createClient();
      const [e, w, p] = await Promise.all([
        s
          .from("giveaway_entries")
          .select("id, member_name")
          .eq("giveaway_id", selected),
        s
          .from("giveaway_winners")
          .select("id, winner_name")
          .eq("giveaway_id", selected),
        s
          .from("giveaway_signups")
          .select("in_game_name")
          .eq("giveaway_id", selected),
      ]);
      if (e.data) setEntries(e.data as Entry[]);
      if (w.data) setWinners(w.data as W[]);
      if (p.data) setPublicSignups(p.data as { in_game_name: string }[]);
    })();
  }, [selected]);

  async function createG(e: React.FormEvent) {
    e.preventDefault();
    const { data: uData } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("giveaways")
      .insert({
        title,
        reward,
        status: "open",
        signup_ends_at: signupEnds ? new Date(signupEnds).toISOString() : null,
      })
      .select("id")
      .single();
    if (!error && data?.id) {
      setSelected(data.id as string);
      const who = uData.user?.email ?? "Officer";
      await logGuildAction(
        supabase,
        `${who} created giveaway “${title || "Giveaway"}” (${reward}).`,
      );
    }
    setTitle("");
    setSignupEnds("");
    loadG();
  }

  async function addEntry(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    await supabase.from("giveaway_entries").insert({
      giveaway_id: selected,
      member_name: entryName,
    });
    setEntryName("");
    const { data } = await supabase
      .from("giveaway_entries")
      .select("id, member_name")
      .eq("giveaway_id", selected);
    if (data) setEntries(data as Entry[]);
  }

  async function pickWinner() {
    if (!selected) return;
    const pool = [
      ...entries.map((x) => x.member_name),
      ...publicSignups.map((x) => x.in_game_name),
    ];
    if (pool.length === 0) {
      alert("Add officer entries and/or wait for public signups.");
      return;
    }
    const i = Math.floor(Math.random() * pool.length);
    const w = pool[i]!;
    await supabase.from("giveaway_winners").insert({
      giveaway_id: selected,
      winner_name: w,
    });
    const { data } = await supabase
      .from("giveaway_winners")
      .select("id, winner_name")
      .eq("giveaway_id", selected);
    if (data) setWinners(data as W[]);
  }

  return (
    <div className="space-y-6">
      <Card className="!p-5">
        <h2 className="font-display text-lg text-gold">New giveaway</h2>
        <form onSubmit={createG} className="mt-3 flex flex-wrap items-end gap-2">
          <input
            className="min-w-[160px] flex-1 rounded-lg border border-gold/25 bg-void/80 px-3 py-2 text-sm"
            placeholder="Title (optional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <input
            className="min-w-[140px] flex-1 rounded-lg border border-gold/25 bg-void/80 px-3 py-2 text-sm"
            placeholder="Reward"
            value={reward}
            onChange={(e) => setReward(e.target.value)}
            required
          />
          <div className="flex flex-col gap-1">
            <label className="text-xs text-mist">Signups end (local)</label>
            <input
              type="datetime-local"
              className="rounded-lg border border-gold/25 bg-void/80 px-2 py-2 text-sm"
              value={signupEnds}
              onChange={(e) => setSignupEnds(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className="rounded-xl bg-gold px-4 py-2 text-sm font-semibold text-void"
          >
            Create
          </button>
        </form>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-2">
          {list.length === 0 && <p className="text-mist">No giveaways.</p>}
          {list.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => setSelected(g.id)}
              className={`w-full rounded-xl border px-3 py-3 text-left text-sm ${
                selected === g.id
                  ? "border-gold bg-gold/10"
                  : "border-gold/20 bg-card/60"
              }`}
            >
              <div className="font-medium text-foreground">{g.title || "Giveaway"}</div>
              <div className="text-gold">{g.reward}</div>
            </button>
          ))}
        </div>
        {selected && (
          <Card className="!p-5">
            <h3 className="font-display text-gold">Entries & winner</h3>
            <form onSubmit={addEntry} className="mt-3 flex gap-2">
              <input
                className="flex-1 rounded-lg border border-gold/25 bg-void/80 px-2 py-2 text-sm"
                placeholder="Member name"
                value={entryName}
                onChange={(e) => setEntryName(e.target.value)}
                required
              />
              <button
                type="submit"
                className="rounded-lg bg-gold/90 px-3 py-2 text-sm font-semibold text-void"
              >
                Add
              </button>
            </form>
            {publicSignups.length > 0 && (
              <p className="mt-1 text-xs text-mist">
                Public signups: {publicSignups.map((s) => s.in_game_name).join(", ")}
              </p>
            )}
            <ul className="mt-2 max-h-32 overflow-auto text-sm text-mist">
              {entries.map((e) => (
                <li key={e.id}>{e.member_name}</li>
              ))}
            </ul>
            <button
              type="button"
              onClick={pickWinner}
              className="mt-3 rounded-xl border border-gold/40 px-4 py-2 text-sm text-gold"
            >
              Pick random winner
            </button>
            {winners.length > 0 && (
              <p className="mt-3 text-sm text-gold-bright">
                Winner(s): {winners.map((w) => w.winner_name).join(", ")}
              </p>
            )}
            <button
              type="button"
              onClick={async () => {
                if (!confirm("Delete this giveaway?")) return;
                await supabase.from("giveaways").delete().eq("id", selected);
                setSelected(null);
                loadG();
              }}
              className="mt-4 text-xs text-red-400"
            >
              Delete giveaway
            </button>
          </Card>
        )}
      </div>
    </div>
  );
}
