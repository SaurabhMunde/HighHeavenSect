"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui-card";

export const GALLERY_SHOTS = [
  { src: "/gallery/group-pic-1.png", title: "Guild snapshot", w: 1200, h: 800 },
  { src: "/gallery/group-pic-2.png", title: "Sect in the jianghu", w: 1200, h: 800 },
  { src: "/gallery/leader-pic.png", title: "Leadership moment", w: 1200, h: 800 },
] as const;

type Shot = (typeof GALLERY_SHOTS)[number];

function isMd() {
  return globalThis.matchMedia?.("(min-width: 768px)").matches ?? false;
}

export function GalleryGrid() {
  const [lightbox, setLightbox] = useState<Shot | null>(null);
  const [hoverPreview, setHoverPreview] = useState<Shot | null>(null);

  const onKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
    },
    []
  );

  useEffect(() => {
    if (!lightbox) return;
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [lightbox, onKey]);

  return (
    <>
      <div className="grid gap-6 sm:grid-cols-2">
        {GALLERY_SHOTS.map((s, i) => (
          <div
            key={s.src}
            className="group relative"
            onMouseEnter={() => {
              if (isMd()) setHoverPreview(s);
            }}
            onMouseLeave={(e) => {
              const next = e.relatedTarget as Node | null;
              if (next && e.currentTarget.contains(next)) return;
              setHoverPreview((h) => (h?.src === s.src ? null : h));
            }}
          >
            <Card
              delay={0.04 * i}
              className="cursor-pointer overflow-hidden p-0"
            >
              <button
                type="button"
                onClick={() => {
                  setHoverPreview(null);
                  setLightbox(s);
                }}
                className="block w-full text-left"
                aria-label={`View full size: ${s.title}`}
              >
                <div className="relative aspect-[4/3] w-full">
                  <Image
                    src={s.src}
                    alt={s.title}
                    fill
                    className="object-cover transition duration-300 group-hover:scale-[1.02] md:group-hover:scale-100"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                  <span className="pointer-events-none absolute inset-0 flex items-end justify-end bg-gradient-to-t from-void/60 to-transparent p-2 opacity-0 transition group-hover:opacity-100">
                    <span className="rounded bg-void/80 px-2 py-0.5 text-xs text-mist">
                      Click for full
                    </span>
                  </span>
                </div>
                <p className="p-3 text-center text-sm text-mist">{s.title}</p>
              </button>
            </Card>

            {hoverPreview?.src === s.src && !lightbox && (
              <div
                className="pointer-events-none fixed inset-0 z-[400] flex items-center justify-center bg-black/50 p-6 backdrop-blur-sm"
                aria-hidden
              >
                <div className="relative max-h-[min(86vh,900px)] max-w-[min(96vw,1200px)]">
                  <Image
                    src={s.src}
                    alt=""
                    width={s.w}
                    height={s.h}
                    className="h-auto max-h-[min(86vh,900px)] w-full object-contain shadow-2xl ring-1 ring-gold/30"
                  />
                  <p className="mt-2 text-center text-sm text-foreground/90">
                    {s.title}
                  </p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-[500] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal
          aria-label={lightbox.title}
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            className="absolute right-3 top-3 rounded-md border border-gold/30 bg-void/90 px-3 py-1 text-sm text-mist transition hover:text-foreground"
            onClick={() => setLightbox(null)}
          >
            Close
          </button>
          <div
            className="relative max-h-[90vh] max-w-6xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={lightbox.src}
              alt={lightbox.title}
              width={lightbox.w}
              height={lightbox.h}
              className="h-auto max-h-[90vh] w-auto max-w-full object-contain"
            />
            <p className="mt-2 text-center text-sm text-mist">{lightbox.title}</p>
          </div>
        </div>
      )}
    </>
  );
}
