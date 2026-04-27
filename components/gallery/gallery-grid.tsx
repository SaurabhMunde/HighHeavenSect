"use client";

import { useCallback, useState } from "react";
import { GALLERY_SHOTS } from "@/lib/gallery-shots";
import type { GalleryShot } from "@/lib/gallery-shots";
import { GalleryImageCard } from "./gallery-image-card";
import { GalleryPreviewModal } from "./gallery-preview-modal";

export function GalleryGrid() {
  const [preview, setPreview] = useState<GalleryShot | null>(null);

  const closePreview = useCallback(() => {
    setPreview(null);
  }, []);

  return (
    <>
      <div className="grid gap-6 sm:grid-cols-2">
        {GALLERY_SHOTS.map((s, i) => (
          <GalleryImageCard
            key={s.src}
            shot={s}
            index={i}
            isPreviewOpen={preview?.src === s.src}
            onToggle={() => {
              setPreview((p) => (p?.src === s.src ? null : s));
            }}
          />
        ))}
      </div>
      <GalleryPreviewModal shot={preview} onClose={closePreview} />
    </>
  );
}
