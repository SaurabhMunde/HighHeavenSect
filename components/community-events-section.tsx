import { createClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/env";
import { compareEventStartIst, eventDateTimeIstToIsoString } from "@/lib/ist-time";
import { CommunityEventCard } from "@/components/community-event-card";

type Ev = {
  id: string;
  title: string;
  description: string;
  event_date: string;
  event_time: string | null;
  host: string;
};

export async function CommunityEventsSection() {
  if (!hasSupabase()) {
    return (
      <section className="mb-10">
        <h2 className="mb-2 text-center font-display text-2xl text-gold-bright">
          Community events
        </h2>
        <p className="text-center text-sm text-mist">
          (Supabase not configured: add keys to show officer-posted events.)
        </p>
      </section>
    );
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select("id, title, description, event_date, event_time, host")
    .order("event_date", { ascending: true });
  const rows = (data ?? []) as Ev[];

  const now = new Date();
  const upcoming: Ev[] = [];
  const past: Ev[] = [];
  for (const e of rows) {
    const t = eventDateTimeIstToIsoString(e.event_date, e.event_time);
    if (new Date(t) >= now) upcoming.push(e);
    else past.push(e);
  }
  upcoming.sort(compareEventStartIst);
  past.sort((a, b) => -compareEventStartIst(a, b));

  if (rows.length === 0) {
    return (
      <section className="mb-10">
        <h2 className="mb-2 text-center font-display text-2xl text-gold-bright">
          Community events
        </h2>
        <p className="text-center text-mist">
          No officer-posted events yet. Static guild rhythm is below.
        </p>
      </section>
    );
  }

  return (
    <section className="mb-10">
      <h2 className="mb-1 text-center font-display text-2xl text-gold-bright">
        Community events
      </h2>
      <p className="mx-auto mb-6 max-w-xl text-center text-sm text-mist">
        Officers enter date and time in{" "}
        <strong className="text-foreground/90">IST (India)</strong>, matching the game. Everyone
        sees the same moment converted to their own time zone.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        {upcoming.map((e, i) => {
          const startIso = e.event_time
            ? eventDateTimeIstToIsoString(e.event_date, e.event_time)
            : null;
          return (
            <CommunityEventCard
              key={e.id}
              ev={e}
              startIso={startIso}
              delay={0.04 * i}
            />
          );
        })}
      </div>
      {upcoming.length === 0 && past.length > 0 && (
        <p className="mb-4 text-center text-sm text-mist">
          No upcoming officer events. Past events:
        </p>
      )}
      {past.length > 0 && (
        <ul className="mt-2 list-none space-y-1 text-center text-sm text-mist/80">
          {past.slice(0, 5).map((e) => (
            <li key={e.id}>
              {e.event_date}: {e.title}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
