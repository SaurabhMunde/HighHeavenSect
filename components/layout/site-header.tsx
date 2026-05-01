"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { SiteBgmToggle } from "./site-bgm-toggle";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/schedule", label: "Schedule" },
  { href: "/quizzes", label: "Quizzes" },
  { href: "/giveaways", label: "Giveaways" },
  { href: "/members", label: "Members" },
  { href: "/recruitment", label: "Recruitment" },
  { href: "/gallery", label: "Gallery" },
  { href: "/leadership", label: "Leadership" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/admin", label: "Admin" },
] as const;

export function SiteHeader() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === href : pathname?.startsWith(href);

  return (
    <header className="sticky top-0 z-50 border-b border-gold/30 bg-gradient-to-b from-[#202b39]/80 via-[#1f2a38]/70 to-[#1b2532]/58">
      <div className="mx-auto max-w-6xl px-4 py-3 md:px-6">
        <div className="rounded-2xl border border-gold/35 bg-[#1e2936]/76 p-3 shadow-[0_10px_26px_rgba(5,10,16,0.3)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link href="/" className="font-display text-lg tracking-wide text-gold-bright">
              HighHeaven<span className="text-mist">Sect</span>
            </Link>
            <div className="flex items-center gap-2 text-xs sm:text-sm">
              <Link
                href="/admin"
                className="rounded-lg border border-gold/30 px-2.5 py-1 text-mist transition hover:border-gold/55 hover:bg-white/10 hover:text-gold-bright"
              >
                Admin
              </Link>
              <SiteBgmToggle />
            </div>
          </div>

          <nav
            className="mt-3 flex flex-wrap items-center gap-1.5 rounded-xl border border-gold/30 bg-white/[0.05] p-1.5 text-xs sm:text-sm"
            aria-label="Main"
          >
            {navItems.map((item) => {
              const active = !!isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg px-3 py-1.5 transition ${
                    active
                      ? "border border-gold/60 bg-[#ffe4ef]/18 text-gold-bright shadow-[0_0_10px_rgba(217,164,187,0.2)]"
                      : "text-mist hover:bg-white/10 hover:text-foreground"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
