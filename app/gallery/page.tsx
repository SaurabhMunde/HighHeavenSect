import type { Metadata } from "next";
import { WuxiaShell } from "@/components/layout";
import { GalleryGrid, GalleryUploadForm } from "@/components/gallery";
import { GALLERY_PAGE_SIZE_DEFAULT, fetchApprovedGalleryPage } from "@/lib/gallery-approved";
import { GALLERY_SHOTS } from "@/lib/gallery-shots";
import { createClient } from "@/lib/supabase/server";

async function loadGalleryBootstrap() {
  const supabase = await createClient();
  const pageSize = GALLERY_PAGE_SIZE_DEFAULT;
  const { shots: approvedFirstPage, total: totalApproved } = await fetchApprovedGalleryPage(supabase, {
    page: 1,
    limit: pageSize,
  });

  const seen = new Set(approvedFirstPage.map((shot) => shot.src));
  const deferredSeedShots = GALLERY_SHOTS.filter((shot) => !seen.has(shot.src));

  return {
    pageSize,
    approvedFirstPage,
    totalApproved,
    deferredSeedShots,
  };
}

export const metadata: Metadata = {
  title: "Gallery",
  description:
    "Photos from the jianghu — HighHeavenSect WWM (Where Winds Meet) SEA English guild gallery.",
  alternates: { canonical: "/gallery" },
};

export default async function GalleryPage() {
  const { pageSize, approvedFirstPage, totalApproved, deferredSeedShots } = await loadGalleryBootstrap();

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
      <GalleryGrid
        approvedFirstPage={approvedFirstPage}
        totalApproved={totalApproved}
        deferredSeedShots={deferredSeedShots}
        pageSize={pageSize}
      />
    </WuxiaShell>
  );
}
