import type { Metadata } from "next";
import { WuxiaShell } from "@/components/layout";
import { Card } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/env";

export const metadata: Metadata = {
  title: "Leaderboard",
  description:
    "Member contribution leaderboard for the HighHeavenSect WWM guild — SEA English community.",
  alternates: { canonical: "/leaderboard" },
};

export const revalidate = 60;

type Row = { id: string; name: string; amount: number };

export default async function LeaderboardPage() {
  let rows: Row[] = [];
  if (hasSupabase()) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("member_contributions")
      .select("id, name, amount")
      .order("amount", { ascending: false });
    rows = (data ?? []) as Row[];
  }

  return (
    <WuxiaShell>
      <div className="mb-8 text-center">
        <h1 className="font-display text-3xl text-gold-bright">Leaderboard</h1>
        <p className="mt-2 text-mist">Top contributors, sorted by amount</p>
      </div>
      {!hasSupabase() && (
        <Card>
          <p className="text-mist">
            Connect Supabase in <code className="text-gold">.env.local</code> to
            show live rankings. Admins can update values from the dashboard.
          </p>
        </Card>
      )}
      {hasSupabase() && rows.length === 0 && (
        <Card>
          <p className="text-mist">No entries yet. Admins can add members from the dashboard.</p>
        </Card>
      )}
      {rows.length > 0 && (
        <div className="space-y-2">
          {rows.map((r, i) => (
            <Card key={r.id} delay={0.02 * i} className="!py-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span
                    className={`font-display text-lg ${
                      i === 0
                        ? "text-gold-bright"
                        : i < 3
                          ? "text-gold"
                          : "text-mist"
                    }`}
                  >
                    #{i + 1}
                  </span>
                  <span className="font-medium text-foreground">{r.name}</span>
                </div>
                <span className="text-gold-bright tabular-nums">
                  {Number(r.amount).toLocaleString()}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </WuxiaShell>
  );
}
