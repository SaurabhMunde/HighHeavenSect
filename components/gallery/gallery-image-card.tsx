"use client";

import Image from "next/image";
import { Card } from "@/components/ui";
import type { GalleryShot } from "@/lib/gallery-shots";

type Props = {
  shot: GalleryShot;
  index: number;
  isPreviewOpen: boolean;
  onToggle: () => void;
};

export function GalleryImageCard({ shot, index, isPreviewOpen, onToggle }: Props) {
  return (
    <Card
      delay={0.04 * index}
      className="cursor-pointer overflow-hidden p-0"
    >
      <button
        type="button"
        onClick={onToggle}
        className="block w-full text-left"
        aria-expanded={isPreviewOpen}
        aria-label={`${isPreviewOpen ? "Close preview" : "Preview"}: ${shot.title}`}
      >
        <div className="relative aspect-[4/3] w-full">
          <Image
            src={shot.src}
            alt={shot.title}
            fill
            className={`object-cover transition duration-300 ${
              isPreviewOpen ? "scale-[1.02] md:scale-100" : ""
            }`}
            sizes="(max-width: 768px) 100vw, 50vw"
          />
          <span className="pointer-events-none absolute inset-0 flex items-end justify-end bg-gradient-to-t from-void/50 to-transparent p-2">
            <span className="rounded bg-void/80 px-2 py-0.5 text-xs text-mist">
              {isPreviewOpen ? "Click to close" : "Click to preview"}
            </span>
          </span>
        </div>
        <p className="p-3 text-center text-sm text-mist">{shot.title}</p>
      </button>
    </Card>
  );
}
