import Link from "next/link";
import { NavMoreMenu } from "./nav-more-menu";

const mainNav = [
  { href: "/", label: "Home" },
  { href: "/schedule", label: "Schedule" },
  { href: "/quizzes", label: "Quizzes" },
  { href: "/giveaways", label: "Giveaways" },
  { href: "/members", label: "Members" },
  { href: "/gallery", label: "Gallery" },
] as const;

const allNav = [
  ...mainNav,
  { href: "/leadership", label: "Leadership" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/recruitment", label: "Recruitment" },
  { href: "/admin/login", label: "Admin" },
] as const;

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-gold/20 bg-void/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl min-w-0 items-center gap-3 px-4 py-2.5 sm:gap-4 sm:px-5 sm:py-3 md:px-6">
        <Link
          href="/"
          className="shrink-0 whitespace-nowrap font-display text-base font-semibold tracking-tight text-gold-bright transition hover:text-gold sm:text-lg"
        >
          HighHeaven<span className="text-mist">Sect</span>
        </Link>

        <div className="hidden min-w-0 flex-1 md:block">
          <div className="min-w-0 max-w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="inline-flex min-h-[2.5rem] items-center gap-0.5 pl-1 sm:gap-1.5">
              {mainNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="shrink-0 whitespace-nowrap rounded-md px-2 py-1.5 text-sm text-mist transition hover:bg-white/5 hover:text-foreground"
                >
                  {item.label}
                </Link>
              ))}

              <NavMoreMenu />
            </div>
          </div>
        </div>

        <details className="relative z-[70] isolate shrink-0 md:hidden">
          <summary className="list-none cursor-pointer rounded-md border border-gold/25 bg-card px-3 py-1.5 text-sm text-foreground shadow-sm">
            Menu
          </summary>
          <div className="absolute right-0 z-[60] mt-2 w-52 max-h-[min(80vh,28rem)] overflow-y-auto rounded-lg border border-gold/30 bg-card py-1 shadow-2xl ring-1 ring-gold/20">
            {allNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block px-3 py-2.5 text-sm text-foreground/95 hover:bg-white/8 hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </details>
      </div>
    </header>
  );
}
