import { NextResponse } from "next/server";
import { notifyGalleryPendingApproval } from "@/lib/discord/run-discord-wwm-notices";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSiteUrl } from "@/lib/site";
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

function fail(
  status: number,
  reason: string,
  details?: string,
  hint?: string,
) {
  return NextResponse.json(
    {
      ok: false,
      error: reason,
      details,
      hint,
    },
    { status },
  );
}

export async function POST(request: Request) {
  if (!assertSameOrigin(request.headers.get("origin"), new URL(request.url).origin)) {
    return fail(
      403,
      "Upload blocked by origin policy.",
      "This request did not come from an allowed page origin.",
      "Refresh the site and submit from the same browser tab.",
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return fail(
      400,
      "Could not read upload form data.",
      "The multipart form payload was invalid or incomplete.",
      "Try selecting the image again and resubmitting.",
    );
  }

  const honeypot = String(formData.get("website") ?? "").trim();
  if (honeypot) {
    return fail(400, "Spam protection triggered.", "Hidden honeypot field was filled.");
  }

  const displayName = normalizeDisplayName(String(formData.get("displayName") ?? ""));
  const title = normalizeOptionalText(String(formData.get("title") ?? ""), MAX_TITLE_LENGTH);
  const caption = normalizeOptionalText(String(formData.get("caption") ?? ""), MAX_CAPTION_LENGTH);
  const width = Number.parseInt(String(formData.get("width") ?? ""), 10);
  const height = Number.parseInt(String(formData.get("height") ?? ""), 10);
  const file = formData.get("file");

  if (!displayName || displayName.length > MAX_DISPLAY_NAME_LENGTH || !isValidDisplayName(displayName)) {
    return fail(
      400,
      "Invalid username/in-game name.",
      "Name must be 2-50 chars and can only use letters, numbers, spaces, apostrophes, dots, brackets, underscores, and hyphens.",
    );
  }

  if (!(file instanceof File)) {
    return fail(400, "No image selected.", "Please choose an image file before submitting.");
  }

  if (!(file.type in ALLOWED_IMAGE_MIME_TYPES)) {
    return fail(
      400,
      "Unsupported file type.",
      `Received type: ${file.type || "unknown"}. Allowed types: image/jpeg, image/png, image/webp.`,
    );
  }

  if (file.size <= 0 || file.size > MAX_IMAGE_UPLOAD_BYTES) {
    return fail(
      400,
      "Invalid file size.",
      `Selected file is ${(file.size / (1024 * 1024)).toFixed(2)} MB. Limit is ${Math.floor(
        MAX_IMAGE_UPLOAD_BYTES / (1024 * 1024),
      )} MB.`,
    );
  }

  const ipHash = hashIp(getClientIp(request.headers));

  let supabase;
  try {
    supabase = createAdminClient();
  } catch (error) {
    return fail(
      503,
      "Upload service is not configured.",
      error instanceof Error ? error.message : "Missing server storage configuration.",
      "Ask an admin to verify SUPABASE_SERVICE_ROLE_KEY and restart the server.",
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
    return fail(
      500,
      "Could not verify upload rate limit.",
      [recentError?.message, dailyError?.message].filter(Boolean).join(" | "),
      "Please retry in a moment.",
    );
  }

  if ((recentCount ?? 0) >= MAX_UPLOADS_PER_15_MINUTES) {
    return fail(
      429,
      "Too many uploads from this connection.",
      `Limit: ${MAX_UPLOADS_PER_15_MINUTES} uploads per 15 minutes.`,
      "Please wait about 15 minutes and try again.",
    );
  }

  if ((dailyCount ?? 0) >= MAX_UPLOADS_PER_DAY) {
    return fail(
      429,
      "Daily upload limit reached.",
      `Limit: ${MAX_UPLOADS_PER_DAY} uploads per 24 hours from this connection.`,
      "Please try again tomorrow.",
    );
  }

  const extension = inferExtension(file.type);
  const privatePath = buildPendingMediaPath("gallery_image", extension);
  const arrayBuffer = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from(GALLERY_SUBMISSIONS_BUCKET)
    .upload(privatePath, arrayBuffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    return fail(
      500,
      "Image upload to storage failed.",
      uploadError.message,
      "Please retry. If this repeats, contact an admin.",
    );
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
    return fail(
      500,
      "Upload metadata could not be saved.",
      insertError.message,
      "The uploaded file was rolled back from storage. Please retry.",
    );
  }

  notifyGalleryPendingApproval({
    displayName,
    title: title ?? null,
    adminGalleryUrl: `${getSiteUrl()}/admin/gallery`,
  }).catch((e) => {
    console.warn("[gallery/upload] Discord review notice skipped:", e);
  });

  return NextResponse.json({
    ok: true,
    message: "Upload received. An admin will review it before it appears in the gallery.",
  });
}
