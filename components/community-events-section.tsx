import { Card } from "@/components/ui-card";
import { createClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/env";
import { PublicCountdown } from "@/components/public-countdown";

type Ev = {
  id: string;
  title: string;
  description: string;
  event_date: string;
  event_time: string | null;
  host: string;
};

function normalizeTime(t: string) {
  if (t.length === 5 && t.includes(":")) return `${t}:00`;
  return t;
}

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
    const t = e.event_time
      ? new Date(`${e.event_date}T${normalizeTime(e.event_time)}`)
      : new Date(`${e.event_date}T23:59:59`);
    if (t >= now) upcoming.push(e);
    else past.push(e);
  }

  if (rows.length === 0) {
    return (
      <section className="mb-10">
        <h2 className="mb-2 text-center font-display text-2xl text-gold-bright">
          Community events
        </h2>
        <p className="text-center text-mist">No officer-posted events yet. Static guild rhythm is below.</p>
      </section>
    );
  }

  return (
    <section className="mb-10">
      <h2 className="mb-1 text-center font-display text-2xl text-gold-bright">Community events</h2>
      <p className="mx-auto mb-6 max-w-xl text-center text-sm text-mist">
        Everyone can read these. Officers add or edit them in the admin Events manager. Times and
        countdowns use your browser time zone (IST, WIB, etc. whatever your device uses).
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        {upcoming.map((e, i) => {
          const timePart = e.event_time ? normalizeTime(e.event_time) : null;
          const startIso = timePart
            ? new Date(`${e.event_date}T${timePart}`).toISOString()
            : null;
          return (
            <Card key={e.id} delay={0.04 * i}>
              <h3 className="font-display text-lg text-gold-bright">{e.title}</h3>
              <p className="text-sm text-mist">
                {e.event_date}
                {e.event_time ? ` · ${e.event_time}` : ""} · host: {e.host}
              </p>
              {startIso && <PublicCountdown targetIso={startIso} />}
              {e.description && (
                <p className="mt-2 whitespace-pre-wrap text-sm text-mist/90">{e.description}</p>
              )}
            </Card>
          );
        })}
      </div>
      {upcoming.length === 0 && past.length > 0 && (
        <p className="mb-4 text-center text-sm text-mist">No upcoming officer events. Past events:</p>
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
