import { NextResponse } from "next/server";

import type { GuildWarDutyKey } from "@/lib/guild-war";
import { GUILD_WAR_DUTY_KEYS } from "@/lib/guild-war";
import { createClient } from "@/lib/supabase/server";

function isDuty(val: unknown): val is GuildWarDutyKey {
  return typeof val === "string" && GUILD_WAR_DUTY_KEYS.includes(val as GuildWarDutyKey);
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    warEventId?: string;
    participantName?: string;
    dutyRole?: string;
  };

  const warEventId = body.warEventId?.trim();
  const participantName = body.participantName?.trim() ?? "";

  if (!warEventId) {
    return NextResponse.json({ error: "warEventId is required." }, { status: 400 });
  }

  if (!participantName.length || participantName.length > 64) {
    return NextResponse.json({ error: "Enter a username (max 64 characters)." }, { status: 400 });
  }

  if (!isDuty(body.dutyRole)) {
    return NextResponse.json({ error: "Choose a role: DPS, TANK, Heal, or Can Fill." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("guild_war_try_signup", {
    p_war_event_id: warEventId,
    p_participant_name: participantName,
    p_duty_role: body.dutyRole,
  });

  if (error) {
    const msg = error.message ?? "";
    if (msg.includes("WAR_FULL")) {
      return NextResponse.json({ error: "Signup is full (30 players)." }, { status: 409 });
    }
    if (msg.includes("NAME_TAKEN") || msg.includes("unique")) {
      return NextResponse.json(
        { error: "That name is already signed up for this war." },
        { status: 409 },
      );
    }
    if (msg.includes("WAR_CLOSED") || msg.includes("WAR_NOT_FOUND")) {
      return NextResponse.json({ error: "This signup is closed or no longer exists." }, { status: 410 });
    }
    if (msg.includes("INVALID_ROLE")) {
      return NextResponse.json({ error: "Invalid role." }, { status: 400 });
    }
    console.error("[guild-war/signup] rpc:", error);
    return NextResponse.json({ error: "Could not save signup." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, signupId: data as string });
}
