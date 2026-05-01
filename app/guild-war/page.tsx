import type { Metadata } from "next";

import {
  PublicGuildWarView,
  type SignupPublic,
  type TeamPublic,
  type WarEventPublic,
} from "@/components/guild-war/public-guild-war-view";
import { WuxiaShell } from "@/components/layout";
import { GUILD_WAR_MAX_SIGNUPS, parseEmbeddedDutySignup } from "@/lib/guild-war";
import { purgeExpiredGuildWarEvents } from "@/lib/guild-war/purge-expired";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Guild War Signup",
  description:
    "Sign up for HighHeavenSect guild war rank matches · DPS, TANK, Heal, and flex slots · first thirty lock the roster.",
  alternates: { canonical: "/guild-war" },
};

async function hydrateTeams(
  sb: Awaited<ReturnType<typeof createClient>>,
  warId: string,
): Promise<TeamPublic[]> {
  const { data: trows } = await sb
    .from("guild_war_teams")
    .select("id, label, sort_order")
    .eq("war_event_id", warId)
    .order("sort_order");

  const teamRows = (trows ?? []) as { id: string; label: string; sort_order: number }[];
  const teamIds = teamRows.map((r) => r.id);
  if (!teamIds.length) return [];

  const { data: assigns } = await sb
    .from("guild_war_team_assignments")
    .select("team_id, signup_id, guild_war_signups(id, participant_name, duty_role)")
    .in("team_id", teamIds);

  const byTeam = new Map<string, TeamPublic["members"]>();
  for (const tid of teamIds) byTeam.set(tid, []);

  for (const row of assigns ?? []) {
    const tid = row.team_id as string;
    const su = parseEmbeddedDutySignup(
      (row as { guild_war_signups?: unknown }).guild_war_signups,
    );
    if (!su) continue;
    const bucket = byTeam.get(tid);
    if (bucket)
      bucket.push({
        signupId: su.id,
        name: su.participant_name,
        duty: su.duty_role,
      });
  }

  return teamRows.map((t) => ({
    id: t.id,
    label: t.label,
    sort_order: t.sort_order,
    members: byTeam.get(t.id) ?? [],
  }));
}

export default async function GuildWarPage({
  searchParams,
}: {
  searchParams?: Promise<{ war?: string }>;
}) {
  await purgeExpiredGuildWarEvents().catch(() => {});
  const sp = searchParams ? await searchParams : {};
  const supabase = await createClient();

  const nowIso = new Date().toISOString();
  const { data: warsRows } = await supabase
    .from("guild_war_events")
    .select("id, title, scheduled_start_at, purge_at, signup_template_default")
    .gt("purge_at", nowIso)
    .order("scheduled_start_at", { ascending: true });

  const wars = (warsRows ?? []) as WarEventPublic[];

  const preferredWarId =
    wars.find((w) => w.id === sp?.war)?.id ?? wars.at(0)?.id ?? "";

  let signups: SignupPublic[] = [];
  let teams: TeamPublic[] = [];

  if (preferredWarId) {
    const { data: su } = await supabase
      .from("guild_war_signups")
      .select("id, participant_name, duty_role, created_at")
      .eq("war_event_id", preferredWarId)
      .order("created_at", { ascending: true });
    signups = (su ?? []) as SignupPublic[];
    teams = await hydrateTeams(supabase, preferredWarId);
  }

  return (
    <WuxiaShell>
      <div className="mb-8 text-center">
        <h1 className="font-display text-3xl text-gold-bright">Guild war signup</h1>
        <p className="mt-2 mx-auto max-w-2xl text-mist">
          Declare your combat role · first {GUILD_WAR_MAX_SIGNUPS} signups lock the roster · formation roster appears on the
          right when officers publish it.
        </p>
      </div>
      <PublicGuildWarView
        wars={wars}
        initialWarId={preferredWarId}
        initialSignups={signups}
        initialTeams={teams}
      />
    </WuxiaShell>
  );
}
