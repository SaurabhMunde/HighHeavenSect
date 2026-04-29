"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useModalDismiss } from "@/hooks/use-modal-dismiss";
import { STORAGE_ASSETS } from "@/lib/storage-public";

export function HomeHero() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  useModalDismiss(open, () => setOpen(false), { lockBody: true });

  return (
    <>
      <section className="relative overflow-hidden rounded-3xl border border-gold/25 bg-gradient-to-b from-card/90 to-void/80 p-6 shadow-card md:p-10">
        <div
          className="pointer-events-none absolute -right-20 top-0 h-64 w-64 rounded-full bg-gold/10 blur-3xl"
          aria-hidden
        />
        <div className="grid gap-8 md:grid-cols-2 md:items-center">
          <div>
            <motion.p
              className="mb-2 text-sm uppercase tracking-[0.25em] text-gold-dim"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              江湖 · HighHeavenSect
            </motion.p>
            <motion.h1
              className="font-display text-3xl font-bold leading-tight text-gold-bright md:text-4xl"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.05 }}
            >
              HighHeavenSect <span className="text-mist">⚔️</span> Walk the Martial
              Path Together
            </motion.h1>
            <motion.p
              className="mt-3 max-w-prose text-base text-mist"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15, duration: 0.5 }}
            >
              The Martial Path is long, but no cultivator walks it alone.
            </motion.p>
            <motion.div
              className="mt-6 flex flex-wrap items-center gap-3"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.45 }}
            >
              <Link
                href="https://discord.gg/erogetof"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-xl bg-gold px-5 py-2.5 text-sm font-semibold text-void transition hover:bg-gold-bright"
              >
                Join on Discord
              </Link>
              <Link
                href="/recruitment"
                className="inline-flex items-center justify-center rounded-xl border border-gold/35 px-5 py-2.5 text-sm text-gold transition hover:border-gold/60 hover:bg-white/5"
              >
                Recruitment
              </Link>
              <Link
                href="/admin"
                className="inline-flex items-center justify-center rounded-xl border border-mist/30 px-5 py-2.5 text-sm text-mist transition hover:border-gold/50 hover:text-foreground"
              >
                Admin
              </Link>
            </motion.div>
          </div>
          <motion.div
            className="relative mx-auto max-w-sm"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="block w-full overflow-hidden rounded-2xl border border-gold/20 shadow-card"
              aria-label="Open guild image preview"
            >
              <Image
                src={STORAGE_ASSETS.siteHero}
                alt="HighHeavenSect guild hall"
                width={640}
                height={400}
                className="h-auto w-full object-cover transition duration-300 hover:scale-[1.01]"
                priority
              />
            </button>
            <p className="mt-2 text-center text-xs text-mist">Click image to enlarge</p>
          </motion.div>
        </div>
      </section>

      {mounted && open
        ? createPortal(
            <div
              className="fixed inset-0 z-[450] flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm"
              role="dialog"
              aria-modal
              aria-label="Guild image preview"
              onClick={() => setOpen(false)}
            >
              <div
                className="relative max-h-[min(88vh,980px)] max-w-[min(96vw,1400px)]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mb-2 flex justify-end">
                  <button
                    type="button"
                    className="rounded-md border border-mist/30 bg-void/60 px-3 py-1.5 text-sm text-mist transition hover:text-foreground"
                    onClick={() => setOpen(false)}
                  >
                    Close
                  </button>
                </div>
                <Image
                  src={STORAGE_ASSETS.siteHero}
                  alt="HighHeavenSect guild hall full preview"
                  width={1600}
                  height={1000}
                  className="h-auto max-h-[min(84vh,980px)] w-full object-contain shadow-2xl ring-1 ring-gold/30"
                />
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
