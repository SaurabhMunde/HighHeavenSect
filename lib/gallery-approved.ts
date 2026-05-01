import type { SupabaseClient } from "@supabase/supabase-js";

import type { GalleryShot } from "@/lib/gallery-shots";
import type { GalleryItem } from "@/lib/media-upload";

export const GALLERY_PAGE_SIZE_DEFAULT = 10;
export const GALLERY_PAGE_SIZE_MAX = 30;

type PageArgs = { page: number; limit?: number };

/**
 * Approved gallery images — paginated — ordered by moderation approval time (newest first).
 */
export async function fetchApprovedGalleryPage(
  supabase: SupabaseClient,
  { page, limit = GALLERY_PAGE_SIZE_DEFAULT }: PageArgs,
): Promise<{ shots: GalleryShot[]; total: number; page: number; limit: number }> {
  const safeLimit = Math.min(Math.max(1, Math.floor(limit)), GALLERY_PAGE_SIZE_MAX);
  const safePage = Math.max(1, Math.floor(page));
  const offset = (safePage - 1) * safeLimit;
  const offsetEnd = offset + safeLimit - 1;

  const { data, error, count } = await supabase
    .from("media_uploads")
    .select("id, title, caption, display_name, width, height, created_at, public_bucket, public_path", {
      count: "exact",
    })
    .eq("kind", "gallery_image")
    .eq("status", "approved")
    .not("public_bucket", "is", null)
    .not("public_path", "is", null)
    .order("approved_at", { ascending: false })
    .range(offset, offsetEnd);

  if (error) {
    console.error("[gallery-approved]", error.message);
    return { shots: [], total: count ?? 0, page: safePage, limit: safeLimit };
  }

  const rows = (data ?? []) as GalleryItem[];
  const total = typeof count === "number" ? count : 0;

  const shots: GalleryShot[] = rows
    .filter((row): row is GalleryItem & { public_bucket: string; public_path: string } => {
      return Boolean(row.public_bucket && row.public_path);
    })
    .map((row) => {
      const { data: publicUrl } = supabase.storage.from(row.public_bucket!).getPublicUrl(row.public_path!);
      return {
        id: row.id,
        src: publicUrl.publicUrl,
        title: row.title || `Shared by ${row.display_name}`,
        caption: row.caption || undefined,
        uploadedBy: row.display_name,
        w: row.width && row.width > 0 ? row.width : 1200,
        h: row.height && row.height > 0 ? row.height : 900,
      };
    });

  return { shots, total, page: safePage, limit: safeLimit };
}
