import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { MediaUploadRow, normalizeOptionalText } from "@/lib/media-upload";

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
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const adminUserId = await getAdminUserId();
  if (!adminUserId) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as { reviewNote?: string };
  const reviewNote = normalizeOptionalText(body.reviewNote ?? "", 240);
  const supabase = createAdminClient();

  const { data, error: fetchError } = await supabase
    .from("media_uploads")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  const row = (data ?? null) as MediaUploadRow | null;

  if (fetchError || !row) {
    return NextResponse.json({ error: "Upload request not found." }, { status: 404 });
  }

  if (row.status !== "pending") {
    return NextResponse.json({ error: "Only pending uploads can be rejected." }, { status: 400 });
  }

  const { error: removeError } = await supabase.storage
    .from(row.private_bucket)
    .remove([row.private_path]);

  if (removeError) {
    return NextResponse.json({ error: `Could not delete the pending file: ${removeError.message}` }, { status: 500 });
  }

  const { error: updateError } = await supabase
    .from("media_uploads")
    .update({
      status: "rejected",
      review_note: reviewNote,
      rejected_by_user_id: adminUserId,
      rejected_at: new Date().toISOString(),
    })
    .eq("id", row.id);

  if (updateError) {
    return NextResponse.json({ error: `Rejection save failed: ${updateError.message}` }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
