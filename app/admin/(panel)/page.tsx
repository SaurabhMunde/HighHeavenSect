import Link from "next/link";
import { Card } from "@/components/ui";

const tiles = [
  { href: "/admin/events", title: "Event manager", blurb: "Add, edit, and remove sect events." },
  { href: "/admin/quiz", title: "Quiz manager", blurb: "Kahoot-style quizzes, timers, and schedule." },
  { href: "/admin/quiz-simulation", title: "Quiz simulation", blurb: "Run admin-only simulations before going live." },
  { href: "/admin/leaderboard", title: "Leaderboard", blurb: "Update member contribution totals." },
  { href: "/admin/giveaways", title: "Giveaways", blurb: "Create draws, set rewards, pick winners." },
  { href: "/admin/recruitment", title: "Recruitment", blurb: "Track who brought whom, 5-day activity." },
];

export default function AdminHomePage() {
  return (
    <div>
      <h1 className="font-display text-2xl text-gold-bright md:text-3xl">Dashboard</h1>
      <p className="mt-2 text-mist">Manage guild tools. Only accounts in the admin list can sign in. Public pages show events, quizzes, and giveaways; you edit them here.</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((t, i) => (
          <Card key={t.href} delay={0.04 * i}>
            <Link href={t.href} className="group block">
              <h2 className="font-display text-lg text-gold group-hover:text-gold-bright">
                {t.title} →
              </h2>
              <p className="mt-2 text-sm text-mist">{t.blurb}</p>
            </Link>
          </Card>
        ))}
      </div>
    </div>
  );
}
