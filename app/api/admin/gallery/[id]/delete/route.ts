import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { MediaUploadRow } from "@/lib/media-upload";

async function getAdminUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: row } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  return row ? user.id : null;
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const adminUserId = await getAdminUserId();
  if (!adminUserId) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const { id } = await context.params;
  const supabase = createAdminClient();

  const { data, error: fetchError } = await supabase
    .from("media_uploads")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  const row = (data ?? null) as MediaUploadRow | null;
  if (fetchError || !row) {
    return NextResponse.json({ error: "Upload record not found." }, { status: 404 });
  }

  if (row.private_bucket && row.private_path) {
    await supabase.storage.from(row.private_bucket).remove([row.private_path]);
  }
  if (row.public_bucket && row.public_path) {
    await supabase.storage.from(row.public_bucket).remove([row.public_path]);
  }

  const { error: deleteError } = await supabase
    .from("media_uploads")
    .delete()
    .eq("id", row.id);

  if (deleteError) {
    return NextResponse.json({ error: `Delete failed: ${deleteError.message}` }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
