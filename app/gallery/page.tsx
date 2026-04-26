import { WuxiaShell } from "@/components/wuxia-shell";
import { GalleryGrid } from "@/components/gallery-grid";

export default function GalleryPage() {
  return (
    <WuxiaShell>
      <div className="mb-8 text-center">
        <h1 className="font-display text-3xl text-gold-bright">Gallery</h1>
        <p className="mt-2 text-mist">
          Moments with the order. Hover on desktop to see the full image; tap or click
          to open a larger view.
        </p>
      </div>
      <GalleryGrid />
    </WuxiaShell>
  );
}
