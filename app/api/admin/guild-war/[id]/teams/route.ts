import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getAdminApiUserId } from "@/lib/supabase/require-admin-api";

type TeamDraft = {
  label?: string;
  signupIds?: string[];
};

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const adminId = await getAdminApiUserId();
  if (!adminId) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const { id: warId } = await context.params;
  const body = (await request.json().catch(() => ({}))) as { teams?: TeamDraft[] };

  const teamsPayload = Array.isArray(body.teams) ? body.teams : [];

  const supabaseUser = await createClient();
  const { data: war } = await supabaseUser.from("guild_war_events").select("id").eq("id", warId).maybeSingle();

  if (!war) {
    return NextResponse.json({ error: "War not found." }, { status: 404 });
  }

  const { data: signups } = await supabaseUser
    .from("guild_war_signups")
    .select("id")
    .eq("war_event_id", warId);

  const allowed = new Set((signups ?? []).map((r) => r.id as string));

  let admin: SupabaseClient;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json(
      {
        error:
          "Saving teams needs SUPABASE_SERVICE_ROLE_KEY on the server (never in the browser). Add it to .env.local and Vercel, then redeploy.",
      },
      { status: 503 },
    );
  }

  const seenAcrossTeams = new Set<string>();

  for (const t of teamsPayload) {
    const ids = [...new Set(t.signupIds ?? [])];
    for (const sid of ids) {
      if (!allowed.has(sid)) {
        return NextResponse.json({ error: "Unknown signup id in team draft." }, { status: 400 });
      }
      if (seenAcrossTeams.has(sid)) {
        return NextResponse.json({ error: "Each player may only appear in one team." }, { status: 400 });
      }
      seenAcrossTeams.add(sid);
    }
  }

  /** Rows cascade-assignments ON DELETE CASCADE */
  const { error: delTeamsErr } = await admin.from("guild_war_teams").delete().eq("war_event_id", warId);

  if (delTeamsErr) {
    return NextResponse.json({ error: delTeamsErr.message }, { status: 500 });
  }

  const assignments: { team_id: string; signup_id: string }[] = [];

  for (let i = 0; i < teamsPayload.length; i++) {
    const t = teamsPayload[i];
    const label = (t.label?.trim() || `Formation ${i + 1}`).slice(0, 64);
    const { data: teamRow, error: teamErr } = await admin
      .from("guild_war_teams")
      .insert({ war_event_id: warId, label, sort_order: i })
      .select("id")
      .single();

    if (teamErr || !teamRow) {
      return NextResponse.json({ error: teamErr?.message ?? "Team insert failed." }, { status: 500 });
    }

    for (const sid of [...new Set(t.signupIds ?? [])]) {
      assignments.push({ team_id: teamRow.id as string, signup_id: sid });
    }
  }

  if (assignments.length) {
    const { error: insErr } = await admin.from("guild_war_team_assignments").insert(assignments);
    if (insErr) {
      return NextResponse.json({ error: insErr.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
