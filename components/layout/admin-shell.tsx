"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AdminSignOut } from "@/components/admin";
import { GuildLogDock } from "./guild-log-dock";
import { SiteBgmToggle } from "./site-bgm-toggle";

const links = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/events", label: "Events" },
  { href: "/admin/gallery", label: "Gallery" },
  { href: "/admin/quiz", label: "Quiz" },
  { href: "/admin/quiz-simulation", label: "Simulation" },
  { href: "/admin/guild-war", label: "Guild War" },
  { href: "/admin/giveaways", label: "Giveaways" },
  { href: "/admin/recruitment", label: "Recruitment" },
];

const adminThemes = {
  heavenly: {
    palette:
      "[--gold:#A88234] [--gold-bright:#8C6821] [--mist:#415769] [--foreground:#243644] [--card:#F3EEDD] [--card-border:rgba(126,93,30,0.44)]",
    shell: "bg-[#EEE8D7]",
    layerTop:
      "bg-[radial-gradient(ellipse_85%_62%_at_50%_-10%,rgba(255,255,246,0.75)_0%,rgba(247,241,224,0.58)_45%,transparent_72%)]",
    layerBase:
      "bg-[linear-gradient(180deg,#EFE8D8_0%,#ECE5D4_52%,#E7E0CD_100%)]",
    glowA: "bg-emerald-300/28",
    glowB: "bg-teal-300/24",
    glowC: "bg-emerald-200/20",
    grain: "opacity-22",
    header: "from-[#F7F1DF]/80 via-[#EFE8D6]/70 to-[#E9E1CF]/65",
    frame: "bg-[#F8F3E5]/72",
    nav: "bg-[#FFF9EC]/58",
    content: "bg-[#F7F2E4]/70 border-[#A87A27]/70",
    text: "text-[#273A49]",
    controlsClass: "admin-light-controls",
  },
  jadeDark: {
    palette:
      "[--gold:#8CBFA2] [--gold-bright:#E8F4EC] [--mist:#A7B8C8] [--foreground:#E8EEF3] [--card:#142126] [--card-border:rgba(140,191,162,0.34)]",
    shell: "bg-[#0f1618]",
    layerTop:
      "bg-[radial-gradient(ellipse_80%_60%_at_50%_-5%,rgba(168,214,188,0.28)_0%,transparent_60%)]",
    layerBase: "bg-[linear-gradient(180deg,#111b1e_0%,#10191c_45%,#0f1618_100%)]",
    glowA: "bg-emerald-200/18",
    glowB: "bg-teal-200/16",
    glowC: "bg-cyan-100/14",
    grain: "opacity-35",
    header: "from-white/10 via-card/40 to-card/20",
    frame: "bg-[#132024]/65",
    nav: "bg-white/[0.04]",
    content: "bg-[#142126]/55 border-white/10",
    text: "text-foreground",
    controlsClass: "",
  },
} as const;

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdminActive = (href: string) =>
    href === "/admin" ? pathname === href : pathname?.startsWith(href);
  const [mode, setMode] = useState<"heavenly" | "jadeDark">("heavenly");

  useEffect(() => {
    const saved = window.localStorage.getItem("admin-theme-mode");
    if (saved === "heavenly" || saved === "jadeDark") {
      setMode(saved);
    }
  }, []);

  function toggleMode() {
    const next = mode === "heavenly" ? "jadeDark" : "heavenly";
    setMode(next);
    window.localStorage.setItem("admin-theme-mode", next);
  }

  const activeTheme = adminThemes[mode];

  return (
    <div
      className={`relative min-h-screen overflow-hidden ${activeTheme.shell} ${activeTheme.palette} ${activeTheme.text} ${activeTheme.controlsClass}`}
    >
      <div className={`pointer-events-none absolute inset-0 ${activeTheme.layerTop}`} />
      <div className={`pointer-events-none absolute inset-0 ${activeTheme.layerBase}`} />
      <div className="pointer-events-none absolute left-0 right-0 top-9 h-px bg-gradient-to-r from-transparent via-[#CFAE64]/85 to-transparent" />
      <div className="pointer-events-none absolute bottom-7 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#CFAE64]/80 to-transparent" />
      <div
        className={`pointer-events-none absolute -top-24 left-1/2 h-96 w-[52rem] -translate-x-1/2 rounded-full ${activeTheme.glowA} blur-3xl`}
      />
      <div
        className={`pointer-events-none absolute -left-20 top-44 h-96 w-96 rounded-full ${activeTheme.glowB} blur-3xl`}
      />
      <div
        className={`pointer-events-none absolute -right-24 bottom-8 h-[26rem] w-[26rem] rounded-full ${activeTheme.glowC} blur-3xl`}
      />
      <div className={`pointer-events-none absolute inset-0 bg-grain ${activeTheme.grain}`} />
      <div
        className={`border-b border-gold/30 bg-gradient-to-b ${activeTheme.header} backdrop-blur`}
      >
        <div className="mx-auto max-w-6xl px-4 py-4 md:px-6">
          <div
            className={`rounded-2xl border border-gold/45 ${activeTheme.frame} p-3 shadow-[0_12px_30px_rgba(121,95,44,0.12)]`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Link
                href="/admin"
                className="font-display text-lg tracking-wide text-gold-bright/95"
              >
                Sect Control
              </Link>
              <div className="flex flex-wrap items-center gap-1.5 text-xs sm:text-sm">
                <Link
                  href="/quizzes"
                  className="rounded-lg border border-gold/30 px-2.5 py-1 text-mist transition hover:border-gold/55 hover:bg-[#FFF8E8]/55 hover:text-gold-bright"
                >
                  Public quizzes
                </Link>
                <Link
                  href="/giveaways"
                  className="rounded-lg border border-gold/30 px-2.5 py-1 text-mist transition hover:border-gold/55 hover:bg-[#FFF8E8]/55 hover:text-gold-bright"
                >
                  Public giveaways
                </Link>
                <Link
                  href="/"
                  className="rounded-lg border border-gold/30 px-2.5 py-1 text-mist transition hover:border-gold/55 hover:bg-[#FFF8E8]/55 hover:text-gold-bright"
                >
                  Public site
                </Link>
                <button
                  type="button"
                  onClick={toggleMode}
                  className="rounded-lg border border-gold/30 px-2.5 py-1 text-mist transition hover:border-gold/55 hover:text-foreground"
                >
                  {mode === "heavenly" ? "Dark Jade" : "Light Heaven"}
                </button>
                <SiteBgmToggle />
                <AdminSignOut />
              </div>
            </div>
            <nav
              className={`mt-3 flex flex-wrap items-center gap-1.5 rounded-xl border border-gold/35 ${activeTheme.nav} p-1.5 text-xs sm:text-sm`}
            >
              {links.map((l) => {
                const active = !!isAdminActive(l.href);
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    className={`rounded-lg px-3 py-1.5 transition ${
                      active
                        ? "border border-gold/60 bg-[#FFF3CF]/65 text-[#8D6A23] shadow-[0_0_0_1px_rgba(201,162,74,0.24)]"
                        : "text-mist hover:bg-[#FFF9EA]/65 hover:text-foreground"
                    }`}
                  >
                    {l.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </div>
      <div className="relative mx-auto max-w-6xl px-4 py-8 md:px-6">
        <div
          className={`rounded-2xl border ${activeTheme.content} p-4 shadow-[0_10px_26px_rgba(121,95,44,0.12)] backdrop-blur-[2px] md:p-6`}
        >
          {children}
        </div>
      </div>
      <GuildLogDock />
    </div>
  );
}
