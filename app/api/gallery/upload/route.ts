import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  ALLOWED_IMAGE_MIME_TYPES,
  GALLERY_SUBMISSIONS_BUCKET,
  MAX_CAPTION_LENGTH,
  MAX_DISPLAY_NAME_LENGTH,
  MAX_IMAGE_UPLOAD_BYTES,
  MAX_TITLE_LENGTH,
  MAX_UPLOADS_PER_15_MINUTES,
  MAX_UPLOADS_PER_DAY,
  assertSameOrigin,
  buildPendingMediaPath,
  getClientIp,
  hashIp,
  inferExtension,
  isValidDisplayName,
  normalizeDisplayName,
  normalizeOptionalText,
} from "@/lib/media-upload";

export async function POST(request: Request) {
  if (!assertSameOrigin(request.headers.get("origin"), new URL(request.url).origin)) {
    return NextResponse.json({ error: "Invalid upload origin." }, { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Upload form could not be read." }, { status: 400 });
  }

  const honeypot = String(formData.get("website") ?? "").trim();
  if (honeypot) {
    return NextResponse.json({ error: "Spam check failed." }, { status: 400 });
  }

  const displayName = normalizeDisplayName(String(formData.get("displayName") ?? ""));
  const title = normalizeOptionalText(String(formData.get("title") ?? ""), MAX_TITLE_LENGTH);
  const caption = normalizeOptionalText(String(formData.get("caption") ?? ""), MAX_CAPTION_LENGTH);
  const width = Number.parseInt(String(formData.get("width") ?? ""), 10);
  const height = Number.parseInt(String(formData.get("height") ?? ""), 10);
  const file = formData.get("file");

  if (!displayName || displayName.length > MAX_DISPLAY_NAME_LENGTH || !isValidDisplayName(displayName)) {
    return NextResponse.json(
      {
        error:
          "Enter a valid in-game name or username (2-50 characters; letters, numbers, spaces, apostrophes, dots, brackets, underscores, and hyphens only).",
      },
      { status: 400 },
    );
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Choose an image before submitting." }, { status: 400 });
  }

  if (!(file.type in ALLOWED_IMAGE_MIME_TYPES)) {
    return NextResponse.json({ error: "Only JPG, PNG, and WEBP images are allowed." }, { status: 400 });
  }

  if (file.size <= 0 || file.size > MAX_IMAGE_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: `Image must be smaller than ${Math.floor(MAX_IMAGE_UPLOAD_BYTES / (1024 * 1024))} MB.` },
      { status: 400 },
    );
  }

  const ipHash = hashIp(getClientIp(request.headers));

  let supabase;
  try {
    supabase = createAdminClient();
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Server storage is not configured yet.",
      },
      { status: 503 },
    );
  }

  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [{ count: recentCount, error: recentError }, { count: dailyCount, error: dailyError }] = await Promise.all([
    supabase
      .from("media_uploads")
      .select("id", { count: "exact", head: true })
      .eq("kind", "gallery_image")
      .eq("uploaded_ip_hash", ipHash)
      .gte("created_at", fifteenMinutesAgo),
    supabase
      .from("media_uploads")
      .select("id", { count: "exact", head: true })
      .eq("kind", "gallery_image")
      .eq("uploaded_ip_hash", ipHash)
      .gte("created_at", oneDayAgo),
  ]);

  if (recentError || dailyError) {
    return NextResponse.json({ error: "Upload rate-limit check failed. Try again." }, { status: 500 });
  }

  if ((recentCount ?? 0) >= MAX_UPLOADS_PER_15_MINUTES) {
    return NextResponse.json(
      { error: "Too many uploads from this connection. Please wait 15 minutes and try again." },
      { status: 429 },
    );
  }

  if ((dailyCount ?? 0) >= MAX_UPLOADS_PER_DAY) {
    return NextResponse.json(
      { error: "Daily upload limit reached for this connection. Try again tomorrow." },
      { status: 429 },
    );
  }

  const extension = inferExtension(file.type);
  const privatePath = buildPendingMediaPath("gallery_image", file.name || "upload", extension);
  const arrayBuffer = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from(GALLERY_SUBMISSIONS_BUCKET)
    .upload(privatePath, arrayBuffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 });
  }

  const { error: insertError } = await supabase.from("media_uploads").insert({
    kind: "gallery_image",
    display_name: displayName,
    title,
    caption,
    original_filename: file.name || "upload",
    mime_type: file.type,
    size_bytes: file.size,
    private_bucket: GALLERY_SUBMISSIONS_BUCKET,
    private_path: privatePath,
    width: Number.isFinite(width) && width > 0 ? width : null,
    height: Number.isFinite(height) && height > 0 ? height : null,
    status: "pending",
    uploaded_ip_hash: ipHash,
    user_agent: request.headers.get("user-agent")?.slice(0, 300) ?? "",
  });

  if (insertError) {
    await supabase.storage.from(GALLERY_SUBMISSIONS_BUCKET).remove([privatePath]);
    return NextResponse.json({ error: `Upload metadata save failed: ${insertError.message}` }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    message: "Upload received. An admin will review it before it appears in the gallery.",
  });
}
