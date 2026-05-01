import { NextResponse } from "next/server";

import { getSiteUrl } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";
import { purgeExpiredGuildWarEvents } from "@/lib/guild-war/purge-expired";
import { getAdminApiUserId } from "@/lib/supabase/require-admin-api";

export async function POST(request: Request) {
  const adminId = await getAdminApiUserId();
  if (!adminId) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    title?: string;
    scheduledStartAt?: string;
  };

  const title = body.title?.replace(/\s+/g, " ").trim() ?? "";
  if (!title.length || title.length > 140) {
    return NextResponse.json({ error: "Title is required (max 140 characters)." }, { status: 400 });
  }

  const iso = body.scheduledStartAt?.trim();
  if (!iso || Number.isNaN(Date.parse(iso))) {
    return NextResponse.json({ error: "scheduledStartAt must be ISO time (UTC)." }, { status: 400 });
  }

  await purgeExpiredGuildWarEvents().catch(() => {});

  const supabase = await createClient();

  const { data: inserted, error: insertErr } = await supabase
    .from("guild_war_events")
    .insert({
      title,
      scheduled_start_at: iso,
      signup_template_default: 3,
    })
    .select("id, scheduled_start_at, purge_at")
    .single();

  if (insertErr || !inserted) {
    console.error("[guild-war/create]", insertErr);
    return NextResponse.json({ error: insertErr?.message ?? "Insert failed." }, { status: 500 });
  }

  const signupUrl = `${getSiteUrl()}/guild-war?war=${inserted.id}`;

  return NextResponse.json({
    ok: true,
    id: inserted.id,
    signupUrl,
  });
}
