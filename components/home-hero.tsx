"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

export function HomeHero() {
  return (
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
              href="/admin/login"
              className="inline-flex items-center justify-center rounded-xl border border-mist/30 px-5 py-2.5 text-sm text-mist transition hover:border-gold/50 hover:text-foreground"
            >
              Admin login
            </Link>
          </motion.div>
        </div>
        <motion.div
          className="relative mx-auto max-w-sm"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          <div className="overflow-hidden rounded-2xl border border-gold/20 shadow-card">
            <Image
              src="/guild-hero.png"
              alt="HighHeavenSect guild hall"
              width={640}
              height={400}
              className="h-auto w-full object-cover"
              priority
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
