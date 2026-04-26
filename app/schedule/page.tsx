import { WuxiaShell } from "@/components/wuxia-shell";
import { Card } from "@/components/ui-card";
import { CommunityEventsSection } from "@/components/community-events-section";

export const dynamic = "force-dynamic";

const items = [
  {
    title: "Guild Hero's Realm",
    when: "Mon, Wed, Sat, Sun (Sunday optional)",
    time: "8:00 PM",
    detail: "Kill 2 bosses with 10 members",
  },
  {
    title: "Breaking Army",
    when: "Wednesday or Saturday",
    time: "7:30 PM",
    detail: "Solo boss, 2 hour window",
  },
  {
    title: "Guild Party",
    when: "Every day (see note for weekend)",
    time: "9:00 PM",
    detail:
      "Stay 15 to 30 min. On Saturday and Sunday, Guild War usually ends around 7:00 PM; Guild Party on those days typically starts around 7:30 PM IST (local time for your group).",
  },
  {
    title: "Guild PvP",
    when: "Thursday & Sunday",
    time: "8:30 PM",
    detail: "Duration: 1 hour",
  },
  {
    title: "Guild War",
    when: "Seasonal · Saturday & Sunday",
    time: "Starts 6:00 PM",
    detail: "Duration ~2.5 hours",
  },
];

export default function SchedulePage() {
  return (
    <WuxiaShell>
      <div className="mb-8 text-center">
        <h1 className="font-display text-3xl text-gold-bright">Guild schedule</h1>
        <p className="mt-2 text-mist">
          All times below are shown in your own time zone (your device clock). Confirm in Discord if
          unsure.
        </p>
        <p className="mt-2 text-sm text-mist max-w-md mx-auto">
          Officer-posted <strong className="text-foreground/90">events</strong> (editable in admin) appear first;
          the cards below are the standing guild rhythm.
        </p>
      </div>
      <CommunityEventsSection />
      <h2 className="font-display text-2xl text-gold/90 text-center mb-4">
        Standing activities
      </h2>
      <div className="grid gap-4 md:grid-cols-2">
        {items.map((s, i) => (
          <Card key={s.title} delay={0.04 * i}>
            <h2 className="font-display text-xl text-gold">{s.title}</h2>
            <p className="mt-1 text-sm text-mist">{s.when}</p>
            <p className="mt-3 font-medium text-foreground">{s.time}</p>
            <p className="mt-2 text-sm text-mist">{s.detail}</p>
          </Card>
        ))}
      </div>
    </WuxiaShell>
  );
}
