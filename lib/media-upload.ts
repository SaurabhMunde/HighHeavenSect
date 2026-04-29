import { createHash, randomUUID } from "crypto";

export const GALLERY_SUBMISSIONS_BUCKET = "gallery-submissions";
export const GALLERY_PUBLIC_BUCKET = "gallery-public";
export const DOCUMENT_SUBMISSIONS_BUCKET = "document-submissions";
export const DOCUMENT_PUBLIC_BUCKET = "document-public";

export const MAX_IMAGE_UPLOAD_BYTES = 8 * 1024 * 1024;
export const MAX_DOCUMENT_UPLOAD_BYTES = 12 * 1024 * 1024;
export const MAX_TITLE_LENGTH = 80;
export const MAX_CAPTION_LENGTH = 240;
export const MAX_DISPLAY_NAME_LENGTH = 50;
export const MAX_UPLOADS_PER_15_MINUTES = 5;
export const MAX_UPLOADS_PER_DAY = 20;

export const ALLOWED_IMAGE_MIME_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

export const ALLOWED_DOCUMENT_MIME_TYPES = {
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
} as const;

export type GalleryItem = {
  id: string;
  title: string;
  caption: string;
  display_name: string;
  width: number | null;
  height: number | null;
  created_at: string;
  public_bucket: string | null;
  public_path: string | null;
};

export type MediaUploadRow = {
  id: string;
  kind: "gallery_image" | "document";
  display_name: string;
  title: string;
  caption: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  private_bucket: string;
  private_path: string;
  public_bucket: string | null;
  public_path: string | null;
  width: number | null;
  height: number | null;
  status: "pending" | "approved" | "rejected";
  uploaded_ip_hash: string | null;
  user_agent: string;
  review_note: string;
  approved_by_user_id: string | null;
  approved_at: string | null;
  rejected_by_user_id: string | null;
  rejected_at: string | null;
  created_at: string;
};

export function normalizeDisplayName(input: string) {
  return input.replace(/\s+/g, " ").trim().slice(0, MAX_DISPLAY_NAME_LENGTH);
}

export function normalizeOptionalText(input: string, maxLength: number) {
  return input.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

export function isValidDisplayName(input: string) {
  return /^[A-Za-z0-9 _.'()[\]-]{2,50}$/.test(input);
}

export function buildPendingMediaPath(kind: "gallery_image" | "document", extension: string) {
  const date = new Date().toISOString().slice(0, 10);
  return `${kind}/pending/${date}/${randomUUID()}.${extension}`;
}

export function buildApprovedMediaPath(kind: "gallery_image" | "document", id: string, extension: string) {
  return `${kind}/approved/${id}/${randomUUID()}.${extension}`;
}

export function hashIp(ip: string) {
  return createHash("sha256").update(ip).digest("hex");
}

export function getClientIp(headers: Headers) {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip")?.trim() || "unknown";
}

export function assertSameOrigin(originHeader: string | null, requestOrigin: string) {
  if (!originHeader) return false;
  try {
    return new URL(originHeader).origin === requestOrigin;
  } catch {
    return false;
  }
}

export function inferExtension(mimeType: string) {
  return ALLOWED_IMAGE_MIME_TYPES[mimeType as keyof typeof ALLOWED_IMAGE_MIME_TYPES]
    ?? ALLOWED_DOCUMENT_MIME_TYPES[mimeType as keyof typeof ALLOWED_DOCUMENT_MIME_TYPES]
    ?? "bin";
}
