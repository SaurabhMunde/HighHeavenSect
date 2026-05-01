"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useModalDismiss } from "@/hooks/use-modal-dismiss";
import { STORAGE_ASSETS } from "@/lib/storage-public";

const HIGHLIGHTS = [
  {
    src: STORAGE_ASSETS.siteHeroSeasonLeagueRewind,
    heading: "League rewind · standings",
    blurb:
      "Latest Season Rewind summary , Guild rank, streaks, and how HighHeavenSect placed in league play.",
    alt: "HighHeavenSect guild war season rewind — league ranking and guild stats",
  },
  {
    src: STORAGE_ASSETS.siteHeroIronTriangle,
    heading: "Iron Triangle · trio standouts",
    blurb:
      "Top performers in damage, tanking pressure, and healing, The carries who shaped our season rewind.",
    alt: "HighHeavenSect Iron Triangle Season Rewind — top damage, damage taken, and healing",
  },
] as const;

export function HomeSeasonHighlights() {
  const [open, setOpen] = useState<(typeof HIGHLIGHTS)[number] | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  useModalDismiss(!!open, () => setOpen(null), { lockBody: true });

  return (
    <>
      <section className="relative overflow-hidden rounded-3xl border border-gold/20 bg-card/52 p-6 shadow-card backdrop-blur-sm md:p-8">
        <div
          className="pointer-events-none absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-emerald-500/8 blur-3xl"
          aria-hidden
        />
        <h2 className="font-display text-xl text-gold-bright md:text-2xl">Season rewind snapshots</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-mist">
          Two highlights from recent in-game Season Rewind panels, Guild league ranking and our Iron Triangle MVP
          standouts, Shared here for the broader sect hall.
        </p>

        <div className="mt-8 grid gap-8 lg:grid-cols-2">  
          {HIGHLIGHTS.map((item, i) => (
            <motion.article
              key={item.src}
              className="flex flex-col"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.45, delay: 0.06 * i }}
            >
              <h3 className="font-display text-lg text-gold">{item.heading}</h3>
              <p className="mt-1 text-xs text-mist">{item.blurb}</p>
              <button
                type="button"
                className="mt-4 block w-full overflow-hidden rounded-2xl border border-gold/18 bg-black/30 shadow-inner outline-none ring-gold/30 transition hover:border-gold/35 focus-visible:ring-2"
                onClick={() => setOpen(item)}
                aria-label={`Enlarge preview: ${item.heading}`}
              >
                <div className="relative aspect-video w-full">
                  <Image
                    src={item.src}
                    alt={item.alt}
                    fill
                    className="object-cover object-center transition duration-300 hover:scale-[1.01]"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                </div>
              </button>
              <p className="mt-2 text-center text-[11px] text-mist/90">Tap to enlarge</p>
            </motion.article>
          ))}
        </div>
      </section>

      {mounted && open ? (
        createPortal(
          <div
            className="fixed inset-0 z-[450] flex items-center justify-center bg-black/62 p-4 backdrop-blur-sm sm:p-6"
            role="dialog"
            aria-modal
            aria-label={`Preview: ${open.heading}`}
            onClick={() => setOpen(null)}
          >
            <div
              className="relative max-h-[min(92vh,1080px)] w-full max-w-[min(96vw,1200px)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-3 flex justify-end">
                <button
                  type="button"
                  className="rounded-lg border border-mist/30 bg-void/70 px-3 py-1.5 text-sm text-mist transition hover:text-foreground"
                  onClick={() => setOpen(null)}
                >
                  Close
                </button>
              </div>
              <div className="relative max-h-[min(84vh,1020px)] w-full overflow-hidden rounded-xl ring-1 ring-gold/25">
                <Image
                  src={open.src}
                  alt={open.alt}
                  width={1400}
                  height={788}
                  className="max-h-[min(84vh,1020px)] w-full object-contain"
                />
              </div>
            </div>
          </div>,
          document.body,
        )
      ) : null}
    </>
  );
}
