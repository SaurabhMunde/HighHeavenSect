"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/admin";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const s = createClient();
      const { error: err } = await s.auth.signInWithPassword({ email, password });
      if (err) {
        setError(err.message);
        return;
      }
      router.push(next);
      router.refresh();
    } catch (unknown) {
      const isFetch =
        unknown instanceof TypeError && unknown.message === "Failed to fetch";
      setError(
        isFetch
          ? "Could not reach Supabase (network). Try: 1) Dashboard → make sure the project is not Paused, 2) turn off ad-blockers/VPN for localhost, 3) run `npm run dev:webpack` instead of `npm run dev` if the problem persists, 4) check browser DevTools → Network for a blocked request to *.supabase.co"
          : unknown instanceof Error
            ? unknown.message
            : "Something went wrong. Try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="block text-sm text-mist" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-lg border border-gold/25 bg-void/80 px-3 py-2 text-foreground outline-none ring-0 focus:border-gold/50"
        />
      </div>
      <div>
        <label className="block text-sm text-mist" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-lg border border-gold/25 bg-void/80 px-3 py-2 text-foreground outline-none focus:border-gold/50"
        />
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-gold py-2.5 text-sm font-semibold text-void transition hover:bg-gold-bright disabled:opacity-50"
      >
        {loading ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
