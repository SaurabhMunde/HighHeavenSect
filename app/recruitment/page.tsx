import type { Metadata } from "next";
import { WuxiaShell } from "@/components/layout";
import { Card } from "@/components/ui";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Recruitment",
  description:
    "How to join HighHeavenSect — a casual Where Winds Meet (WWM) SEA English guild. Discord, officers, and an open gate for fellow wanderers.",
  alternates: { canonical: "/recruitment" },
};

export default function RecruitmentPage() {
  return (
    <WuxiaShell>
      <div className="mb-8 text-center">
        <h1 className="font-display text-3xl text-gold-bright">Recruitment</h1>
        <p className="mt-2 text-mist">The gate is open to fellow wanderers</p>
      </div>
      <div className="mx-auto max-w-2xl space-y-4">
        <Card>
          <h2 className="font-display text-xl text-gold">Casual first</h2>
          <p className="mt-3 text-mist">
            We&apos;re a relaxed guild. Real life comes first, and the jianghu
            second. Show up when you can, be kind, and we&apos;ll get along.
          </p>
        </Card>
        <Card delay={0.05}>
          <h2 className="font-display text-xl text-gold">No hard requirements</h2>
          <p className="mt-3 text-mist">
            No DPS parse gates or rigid rosters for everyday play. We run
            content together and figure things out as a group.
          </p>
        </Card>
        <Card delay={0.1}>
          <h2 className="font-display text-xl text-gold">Stay active</h2>
          <p className="mt-3 text-mist">
            A quick hello on Discord from time to time is enough. Long silences
            make it hard to know you&apos;re still with us.
          </p>
        </Card>
        <Card delay={0.12}>
          <h2 className="font-display text-xl text-gold">How to join</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-mist">
            <li>
              Join <strong className="text-foreground/90">Discord</strong> and message any{" "}
              <strong className="text-foreground/90">officer or admin</strong> so we know you are in.
            </li>
            <li>
              In game, find the guild with{" "}
              <strong className="text-foreground/90">name search: HighHeavenSect</strong>, id{" "}
              <strong className="text-foreground/90">10004908</strong>, and apply, or message a recruiter
              (e.g. <strong className="text-foreground/90">Yami</strong>), officer, or the leader in game.
            </li>
          </ol>
          <p className="mt-3 text-mist">
            Schedules, tags, and call-outs still live in Discord. If one path is slow, use the other.
          </p>
          <Link
            href="https://discord.gg/erogetof"
            className="mt-4 inline-block rounded-xl bg-gold px-5 py-2.5 text-sm font-semibold text-void transition hover:bg-gold-bright"
            target="_blank"
            rel="noopener noreferrer"
          >
            Open discord.gg/erogetof
          </Link>
        </Card>
      </div>
    </WuxiaShell>
  );
}
