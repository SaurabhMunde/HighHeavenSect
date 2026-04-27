import Link from "next/link";
import { AdminSignOut } from "@/components/admin";

const links = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/events", label: "Events" },
  { href: "/admin/quiz", label: "Quiz" },
  { href: "/admin/leaderboard", label: "Leaderboard" },
  { href: "/admin/giveaways", label: "Giveaways" },
  { href: "/admin/recruitment", label: "Recruitment" },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-void">
      <div className="border-b border-gold/20 bg-card/50 backdrop-blur">
        <div className="mx-auto flex max-w-6xl min-w-0 flex-wrap items-center justify-between gap-3 px-4 py-3 md:flex-nowrap md:px-6">
          <Link
            href="/admin"
            className="shrink-0 font-display text-gold-bright"
          >
            Sect control
          </Link>
          <nav className="flex min-w-0 max-w-full flex-nowrap items-center gap-0.5 overflow-x-auto text-xs [scrollbar-width:none] sm:text-sm md:justify-end [&::-webkit-scrollbar]:hidden">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="shrink-0 rounded-md px-1.5 py-1 text-mist transition hover:bg-white/5 hover:text-foreground sm:px-2"
              >
                {l.label}
              </Link>
            ))}
            <span className="mx-0.5 shrink-0 text-mist/40 sm:mx-1">|</span>
            <Link
              href="/quizzes"
              className="shrink-0 rounded-md px-1.5 py-1 text-mist transition hover:text-gold sm:px-2"
            >
              Public quizzes
            </Link>
            <Link
              href="/giveaways"
              className="shrink-0 rounded-md px-1.5 py-1 text-mist transition hover:text-gold sm:px-2"
            >
              Public giveaways
            </Link>
            <Link
              href="/"
              className="shrink-0 rounded-md px-1.5 py-1 text-mist transition hover:text-gold sm:px-2"
            >
              Public site
            </Link>
            <span className="shrink-0 pl-0.5">
              <AdminSignOut />
            </span>
          </nav>
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-6">{children}</div>
    </div>
  );
}
