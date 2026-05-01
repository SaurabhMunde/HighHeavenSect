import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getAdminApiUserId } from "@/lib/supabase/require-admin-api";

export async function DELETE(
  _: Request,
  context: { params: Promise<{ id: string }> },
) {
  const adminId = await getAdminApiUserId();
  if (!adminId) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const { id } = await context.params;

  const supabase = await createClient();
  const { data: row } = await supabase.from("guild_war_events").select("id").eq("id", id).maybeSingle();
  if (!row) {
    return NextResponse.json({ error: "War not found." }, { status: 404 });
  }

  /** Service-role delete even if purge window passed — admin override */
  const admin = createAdminClient();
  const { error } = await admin.from("guild_war_events").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
