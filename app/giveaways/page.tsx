import type { Metadata } from "next";
import { WuxiaShell } from "@/components/layout";
import { Card } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/env";
import { GiveawaySignupForm } from "@/components/giveaways";
import { LocalDateTime, PublicCountdown } from "@/components/community";

export const metadata: Metadata = {
  title: "Giveaways",
  description:
    "HighHeavenSect WWM guild giveaways: rewards, signups, and winners for our SEA English Where Winds Meet community.",
  alternates: { canonical: "/giveaways" },
};

export const dynamic = "force-dynamic";

type G = {
  id: string;
  title: string;
  reward: string;
  status: string;
  created_at: string;
  signup_ends_at: string | null;
};
type W = { winner_name: string; created_at: string };

function isGiveawayOpen(g: G) {
  if (g.status === "closed") return false;
  if (g.signup_ends_at) return new Date() <= new Date(g.signup_ends_at);
  return g.status === "open";
}

export default async function PublicGiveawaysPage() {
  const giveaways: G[] = [];
  const signups: Record<string, number> = {};
  const legacyEntries: Record<string, number> = {};
  const winnersByG: Record<string, W[]> = {};

  if (hasSupabase()) {
    const supabase = await createClient();
    // Finalize ended giveaways first (close + pick random winner).
    await supabase.rpc("auto_finalize_giveaways");
    const { data: gs } = await supabase
      .from("giveaways")
      .select("id, title, reward, status, created_at, signup_ends_at")
      .order("created_at", { ascending: false });
    const rows = (gs ?? []) as G[];
    giveaways.push(...rows);

    await Promise.all(
      rows.map(async (g) => {
        const [c1, c2, wins] = await Promise.all([
          supabase
            .from("giveaway_signups")
            .select("id", { count: "exact", head: true })
            .eq("giveaway_id", g.id),
          supabase
            .from("giveaway_entries")
            .select("id", { count: "exact", head: true })
            .eq("giveaway_id", g.id),
          supabase
            .from("giveaway_winners")
            .select("winner_name, created_at")
            .eq("giveaway_id", g.id)
            .order("created_at", { ascending: false }),
        ]);

        signups[g.id] = c1.count ?? 0;
        legacyEntries[g.id] = c2.count ?? 0;
        winnersByG[g.id] = (wins.data ?? []) as W[];
      }),
    );
  }

  return (
    <WuxiaShell>
      <div className="mb-8 text-center">
        <h1 className="font-display text-3xl text-gold-bright">Giveaways</h1>
        <p className="mt-2 mx-auto max-w-2xl text-mist">
          Open draws show the reward, signup deadline (your local time), and a one name per device
          form. When a draw is over, you will mostly see the declared winners. Officers still manage
          entries and the random pick in the admin area.
        </p>
      </div>
      {!hasSupabase() && (
        <Card>
          <p className="text-mist">Connect Supabase in .env.local to list giveaways.</p>
        </Card>
      )}
      {hasSupabase() && giveaways.length === 0 && (
        <Card>
          <p className="text-mist">No giveaways posted yet.</p>
        </Card>
      )}
      <div className="space-y-4">
        {giveaways.map((g, i) => {
          const open = isGiveawayOpen(g);
          const past = !open;
          return (
            <Card key={g.id} delay={0.03 * i}>
              <h2 className="font-display text-lg text-gold-bright">
                {g.title || "Giveaway"}
              </h2>
              {past && (
                <div>
                  {winnersByG[g.id]?.length > 0 ? (
                    <div className="mt-2">
                      <p className="text-sm text-mist">Results</p>
                      <ul className="mt-1 list-inside list-disc text-foreground">
                        {winnersByG[g.id].map((w) => (
                          <li key={w.winner_name + w.created_at}>{w.winner_name}</li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="mt-2 text-mist">This draw is closed.</p>
                  )}
                </div>
              )}
              {!past && (
                <div>
                  <p className="text-gold">Reward: {g.reward}</p>
                  <p className="mt-1 text-sm text-mist">Status: {g.status}</p>
                  {g.signup_ends_at && (
                    <div className="text-sm text-mist">
                      <p>
                        Signups close (your time): <LocalDateTime iso={g.signup_ends_at} />
                      </p>
                      <PublicCountdown targetIso={g.signup_ends_at} label="Ends in" />
                    </div>
                  )}
                  <p className="text-sm text-mist">
                    Public signups: {signups[g.id] ?? 0}
                    {legacyEntries[g.id] ? `, officer entries: ${legacyEntries[g.id]}` : ""}
                  </p>
                  {open && <GiveawaySignupForm giveawayId={g.id} />}
                  {winnersByG[g.id]?.length > 0 && (
                    <div className="mt-3 border-t border-gold/15 pt-2">
                      <p className="text-xs text-mist">Winners so far</p>
                      <ul className="text-sm text-foreground">
                        {winnersByG[g.id].map((w) => (
                          <li key={w.winner_name + w.created_at}>{w.winner_name}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </WuxiaShell>
  );
}
