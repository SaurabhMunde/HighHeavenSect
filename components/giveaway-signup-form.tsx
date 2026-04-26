"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getOrCreatePlayerKey } from "@/lib/player-key";

export function GiveawaySignupForm({ giveawayId }: { giveawayId: string }) {
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!name.trim()) {
      setMsg("Enter your in-game name.");
      return;
    }
    setLoading(true);
    const s = createClient();
    const key = getOrCreatePlayerKey();
    const { error } = await s.from("giveaway_signups").insert({
      giveaway_id: giveawayId,
      in_game_name: name.trim(),
      player_key: key,
    });
    if (error) {
      if (/duplicate|unique/i.test(String(error.message))) {
        setMsg("You (or that name) are already in this draw from this device.");
      } else {
        setMsg(error.message);
      }
    } else {
      setMsg("You are in. Good luck.");
      setName("");
    }
    setLoading(false);
  }

  return (
    <form
      onSubmit={submit}
      className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end"
    >
      <div className="min-w-0 flex-1">
        <label className="text-xs text-mist" htmlFor={`ign-${giveawayId}`}>
          In-game name (one entry per name per device)
        </label>
        <input
          id={`ign-${giveawayId}`}
          className="mt-1 w-full rounded-lg border border-gold/25 bg-void px-3 py-2 text-sm"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="shrink-0 rounded-xl bg-gold/90 px-4 py-2 text-sm font-semibold text-void disabled:opacity-50"
      >
        {loading ? "…" : "Sign up"}
      </button>
      {msg && <p className="basis-full text-sm text-gold/90">{msg}</p>}
    </form>
  );
}
