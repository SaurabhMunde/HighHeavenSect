import { WuxiaShell } from "@/components/wuxia-shell";
import { CommunityEventsSection } from "@/components/community-events-section";
import { StandingScheduleCards } from "@/components/standing-schedule-cards";

export const dynamic = "force-dynamic";

export default function SchedulePage() {
  return (
    <WuxiaShell>
      <div className="mb-8 text-center">
        <h1 className="font-display text-3xl text-gold-bright">Guild schedule</h1>
        <p className="mt-2 text-mist max-w-2xl mx-auto">
          Standing activities are given in the guild&rsquo;s home time,{" "}
          <strong className="text-foreground/90">India (IST)</strong>. We show each time converted
          to <strong className="text-foreground/90">your</strong> device time zone, so 6:00 PM in
          India may read as a different clock time where you are.
        </p>
        <p className="mt-2 text-sm text-mist max-w-md mx-auto">
          Officer-posted <strong className="text-foreground/90">events</strong> (editable in admin)
          use IST for date and time, then appear in your local time below.
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
