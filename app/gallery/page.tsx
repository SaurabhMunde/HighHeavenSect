import type { Metadata } from "next";
import { WuxiaShell } from "@/components/layout";
import { GalleryGrid, GalleryUploadForm } from "@/components/gallery";
import { GALLERY_SHOTS } from "@/lib/gallery-shots";
import { createClient } from "@/lib/supabase/server";
import type { GalleryItem } from "@/lib/media-upload";

async function getGalleryShots() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("media_uploads")
    .select("id, title, caption, display_name, width, height, created_at, public_bucket, public_path")
    .eq("kind", "gallery_image")
    .eq("status", "approved")
    .not("public_bucket", "is", null)
    .not("public_path", "is", null)
    .order("approved_at", { ascending: false })
    .limit(100);

  const rows = (data ?? []) as GalleryItem[];
  const approvedShots = rows
    .filter((row) => row.public_bucket && row.public_path)
    .map((row) => {
      const { data: publicUrl } = supabase.storage
        .from(row.public_bucket!)
        .getPublicUrl(row.public_path!);

      return {
        src: publicUrl.publicUrl,
        title: row.title || `Shared by ${row.display_name}`,
        caption: row.caption || undefined,
        uploadedBy: row.display_name,
        w: row.width && row.width > 0 ? row.width : 1200,
        h: row.height && row.height > 0 ? row.height : 900,
      };
    });

  const seen = new Set(approvedShots.map((shot) => shot.src));
  const seedShots = GALLERY_SHOTS.filter((shot) => !seen.has(shot.src));
  return [...approvedShots, ...seedShots];
}

export const metadata: Metadata = {
  title: "Gallery",
  description:
    "Photos from the jianghu — HighHeavenSect WWM (Where Winds Meet) SEA English guild gallery.",
  alternates: { canonical: "/gallery" },
};

export default async function GalleryPage() {
  const shots = await getGalleryShots();

  return (
    <WuxiaShell>
      <div className="mb-8 text-center">
        <h1 className="font-display text-3xl text-gold-bright">Gallery</h1>
        <p className="mt-2 text-mist">
          Approved screenshots from the sect. Click a photo to preview it, or submit your own for admin review below.
        </p>
      </div>
      <div className="mb-8">
        <GalleryUploadForm />
      </div>
      <GalleryGrid shots={shots} />
    </WuxiaShell>
  );
}
