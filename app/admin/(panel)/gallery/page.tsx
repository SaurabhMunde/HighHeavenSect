import { AdminGalleryManager } from "@/components/admin/admin-gallery-manager";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { MediaUploadRow } from "@/lib/media-upload";

export default async function AdminGalleryPage() {
  const supabase = await createClient();
  const { data: pendingData } = await supabase
    .from("media_uploads")
    .select("*")
    .eq("kind", "gallery_image")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(50);

  const { data: approvedData } = await supabase
    .from("media_uploads")
    .select("*")
    .eq("kind", "gallery_image")
    .eq("status", "approved")
    .order("approved_at", { ascending: false })
    .limit(200);

  const pendingRows = ((pendingData ?? []) as MediaUploadRow[]);
  const approvedRows = ((approvedData ?? []) as MediaUploadRow[]);

  let previewUrls = new Map<string, string>();
  if (pendingRows.length > 0) {
    try {
      const admin = createAdminClient();
      await Promise.all(
        pendingRows.map(async (row) => {
          const { data: signed } = await admin.storage
            .from(row.private_bucket)
            .createSignedUrl(row.private_path, 60 * 60);
          if (signed?.signedUrl) {
            previewUrls.set(row.id, signed.signedUrl);
          }
        }),
      );
    } catch {
      // The admin list still renders without previews if service role env is not configured yet.
    }
  }

  const pendingViewRows = pendingRows.map((row) => ({
    id: row.id,
    title: row.title,
    caption: row.caption,
    display_name: row.display_name,
    created_at: row.created_at,
    width: row.width,
    height: row.height,
    size_bytes: row.size_bytes,
    mime_type: row.mime_type,
    preview_url: previewUrls.get(row.id) ?? null,
  }));

  const approvedViewRows = approvedRows.map((row) => ({
    id: row.id,
    title: row.title,
    caption: row.caption,
    display_name: row.display_name,
    created_at: row.created_at,
    approved_at: row.approved_at,
    size_bytes: row.size_bytes,
    mime_type: row.mime_type,
    width: row.width,
    height: row.height,
  }));

  return (
    <AdminGalleryManager
      pendingRows={pendingViewRows}
      approvedRows={approvedViewRows}
    />
  );
}
