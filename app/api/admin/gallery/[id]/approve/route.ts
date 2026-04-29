import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  GALLERY_PUBLIC_BUCKET,
  MediaUploadRow,
  buildApprovedMediaPath,
  inferExtension,
  normalizeOptionalText,
} from "@/lib/media-upload";

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
    return NextResponse.json({ error: "Only pending uploads can be approved." }, { status: 400 });
  }

  const extension = inferExtension(row.mime_type);
  const publicPath = buildApprovedMediaPath(row.kind, row.id, extension);

  const { data: fileData, error: downloadError } = await supabase.storage
    .from(row.private_bucket)
    .download(row.private_path);

  if (downloadError || !fileData) {
    return NextResponse.json(
      { error: `Could not read the pending file: ${downloadError?.message ?? "missing file"}` },
      { status: 500 },
    );
  }

  const fileBuffer = await fileData.arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from(GALLERY_PUBLIC_BUCKET)
    .upload(publicPath, fileBuffer, {
      contentType: row.mime_type,
      upsert: true,
    });

  if (uploadError) {
    return NextResponse.json({ error: `Could not publish the file: ${uploadError.message}` }, { status: 500 });
  }

  const { error: updateError } = await supabase
    .from("media_uploads")
    .update({
      status: "approved",
      public_bucket: GALLERY_PUBLIC_BUCKET,
      public_path: publicPath,
      approved_by_user_id: adminUserId,
      approved_at: new Date().toISOString(),
      rejected_by_user_id: null,
      rejected_at: null,
      review_note: reviewNote,
    })
    .eq("id", row.id);

  if (updateError) {
    return NextResponse.json({ error: `Approval save failed: ${updateError.message}` }, { status: 500 });
  }

  await supabase.storage.from(row.private_bucket).remove([row.private_path]);

  return NextResponse.json({ ok: true });
}
