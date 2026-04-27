import type { Metadata } from "next";
import { WuxiaShell } from "@/components/layout";
import { HomeHero } from "@/components/home";
import { Card } from "@/components/ui";
import { getSiteUrl } from "@/lib/site";

const homeDesc =
  "Join HighHeavenSect — a casual Where Winds Meet (WWM) guild for SEA & English speakers. Site schedule, quizzes, giveaways, recruitment, and Discord.";

export const metadata: Metadata = {
  title: "Where Winds Meet (WWM) SEA English guild",
  description: homeDesc,
  alternates: { canonical: "/" },
  openGraph: {
    title: "HighHeavenSect | WWM SEA English guild",
    description: homeDesc,
    url: getSiteUrl(),
  },
};

function ProsperityBadge() {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-4 py-2 font-display text-sm text-gold-bright">
      <span
        className="inline-block h-2 w-2 animate-pulse rounded-full bg-gold"
        aria-hidden
      />
      2 Million Prosperity
    </div>
  );
}

export default function HomePage() {
  return (
    <WuxiaShell>
      <div className="space-y-10">
        <HomeHero />
        <div className="flex flex-col items-center gap-3 text-center animate-fade-in">
          <ProsperityBadge />
          <p className="text-sm text-mist">Guild hall milestone</p>
        </div>
        <Card>
          <h2 className="font-display text-xl text-gold-bright">Who we are</h2>
          <p className="mt-3 leading-relaxed text-mist">
            We play <strong className="text-foreground">Where Winds Meet</strong>{" "}
            (<abbr title="Where Winds Meet" className="no-underline">WWM</abbr>
            )—a{" "}
            <strong className="text-foreground">casual</strong>{" "}
            <strong className="text-foreground">SEA</strong> English guild and
            community for the jianghu. Chill runs, clear comms, and good company
            on the long road. No elitist drama—just cultivators who show up, help
            each other, and enjoy the game together.
          </p>
        </Card>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              t: "Schedule",
              d: "Standing rhythm + officer-posted community events with countdowns.",
              h: "/schedule",
            },
            {
              t: "Quizzes",
              d: "See open times, join codes, and when each room closes. Your local time zone.",
              h: "/quizzes",
            },
            {
              t: "Giveaways",
              d: "Rewards, entry count, and announced winners (everyone can read).",
              h: "/giveaways",
            },
            {
              t: "Members",
              d: "Meet the names behind the tag.",
              h: "/members",
            },
            {
              t: "Recruitment",
              d: "How to join—casual, clear comms, Discord first.",
              h: "/recruitment",
            },
            {
              t: "Leadership",
              d: "Sect head, officers, and elders of the order.",
              h: "/leadership",
            },
            {
              t: "Gallery",
              d: "Group and hall shots from the jianghu.",
              h: "/gallery",
            },
          ].map((x, i) => (
            <Card key={x.t} delay={0.05 * i}>
              <a href={x.h} className="group block">
                <h3 className="font-display text-lg text-gold transition group-hover:text-gold-bright">
                  {x.t} →
                </h3>
                <p className="mt-2 text-sm text-mist">{x.d}</p>
              </a>
            </Card>
          ))}
        </div>
      </div>
    </WuxiaShell>
  );
}
