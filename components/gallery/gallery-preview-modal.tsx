"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useModalDismiss } from "@/hooks/use-modal-dismiss";
import type { GalleryShot } from "@/lib/gallery-shots";

type Props = {
  shot: GalleryShot | null;
  onClose: () => void;
};

export function GalleryPreviewModal({ shot, onClose }: Props) {
  const [mounted, setMounted] = useState(false);
  const open = shot !== null;

  useEffect(() => setMounted(true), []);
  useModalDismiss(open, onClose, { lockBody: true });

  if (!mounted || !shot) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[400] flex items-center justify-center bg-black/50 p-6 backdrop-blur-sm"
      role="dialog"
      aria-modal
      aria-label={shot.title}
      onClick={onClose}
    >
      <div
        className="relative max-h-[min(86vh,900px)] max-w-[min(96vw,1200px)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2 flex flex-wrap items-center justify-end">
          <button
            type="button"
            className="rounded-md border border-mist/30 bg-void/60 px-3 py-1.5 text-sm text-mist transition hover:text-foreground"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <Image
          src={shot.src}
          alt={shot.title}
          width={shot.w}
          height={shot.h}
          className="h-auto max-h-[min(86vh,900px)] w-full object-contain shadow-2xl ring-1 ring-gold/30"
        />
        <div className="mt-2 text-center">
          <p className="text-sm text-foreground/90">{shot.title}</p>
          {shot.caption && <p className="mt-1 text-xs text-mist">{shot.caption}</p>}
          {shot.uploadedBy && <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-gold/80">Shared by {shot.uploadedBy}</p>}
        </div>
      </div>
    </div>,
    document.body
  );
}
