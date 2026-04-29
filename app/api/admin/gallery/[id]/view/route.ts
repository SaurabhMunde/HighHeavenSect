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

export async function GET(
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
    return NextResponse.json({ error: "Image record not found." }, { status: 404 });
  }

  const bucket = row.public_bucket || row.private_bucket;
  const objectPath = row.public_path || row.private_path;
  if (!bucket || !objectPath) {
    return NextResponse.json({ error: "No image path found for this record." }, { status: 400 });
  }

  const { data: signedData, error: signError } = await supabase.storage
    .from(bucket)
    .createSignedUrl(objectPath, 60 * 10);

  if (signError || !signedData?.signedUrl) {
    return NextResponse.json(
      { error: `Could not create preview URL: ${signError?.message ?? "unknown error"}` },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    previewUrl: signedData.signedUrl,
  });
}
