import type { Metadata } from "next";
import { WuxiaShell } from "@/components/layout";
import { CommunityEventsSection, StandingScheduleCards } from "@/components/community";

export const metadata: Metadata = {
  title: "Guild schedule",
  description:
    "HighHeavenSect WWM guild schedule: standing activities and officer-posted community events, shown in your local time zone. SEA English community.",
  alternates: { canonical: "/schedule" },
};

export const dynamic = "force-dynamic";

export default function SchedulePage() {
  return (
    <WuxiaShell>
      <div className="mb-8 text-center">
        <h1 className="font-display text-3xl text-gold-bright">Guild schedule</h1>
        <p className="mt-2 text-mist max-w-2xl mx-auto">
          We&rsquo;re a <strong className="text-foreground/90">Southeast Asia</strong> community.
          Everything on this page is shown in <strong className="text-foreground/90">your</strong>{" "}
          time zone, so the same activity lines up for everyone in-game and on the site.
        </p>
        <p className="mt-2 text-sm text-mist max-w-md mx-auto">
          Officer events appear below in your local time. When adding an event, officers use the
          reference in <strong className="text-foreground/90">Admin</strong> (date/time entry).
        </p>
      </div>
      <CommunityEventsSection />
      <h2 className="font-display text-2xl text-gold/90 text-center mb-4">
        Standing activities
      </h2>
      <StandingScheduleCards />
    </WuxiaShell>
  );
}
