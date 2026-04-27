import type { Metadata } from "next";
import { WuxiaShell } from "@/components/layout";
import { GalleryGrid } from "@/components/gallery";

export const metadata: Metadata = {
  title: "Gallery",
  description:
    "Photos from the jianghu — HighHeavenSect WWM (Where Winds Meet) SEA English guild gallery.",
  alternates: { canonical: "/gallery" },
};

export default function GalleryPage() {
  return (
    <WuxiaShell>
      <div className="mb-8 text-center">
        <h1 className="font-display text-3xl text-gold-bright">Gallery</h1>
        <p className="mt-2 text-mist">
          Moments with the order. Click a photo to open the preview, then close with
          the button, the dimmed area, or Esc.
        </p>
      </div>
      <GalleryGrid />
    </WuxiaShell>
  );
}
