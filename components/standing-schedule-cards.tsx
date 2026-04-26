"use client";

import { Card } from "@/components/ui-card";
import { istClockToLocalString } from "@/lib/ist-time";
import { STANDING_ACTIVITIES, type StandingActivity } from "@/lib/standing-schedule";

function lineFor(a: StandingActivity): string {
  if (a.kind === "party") {
    const daily = istClockToLocalString(a.defaultHour, a.defaultMinute);
    return `Default time: ${daily}`;
  }
  const t = istClockToLocalString(a.hour, a.minute);
  if (a.lineTemplate === "starts") return `Starts ${t}`;
  return t;
}

function detailFor(a: StandingActivity): string | null {
  if (a.kind !== "party") return a.detail || null;
  const warEnd = istClockToLocalString(19, 0);
  const partyStart = istClockToLocalString(19, 30);
  return `Stay 15 to 30 min. On Saturday and Sunday, Guild War usually ends around ${warEnd}; Guild Party on those days typically starts around ${partyStart} (your local time). The default daily party time above is also shown in your time zone.`;
}

export function StandingScheduleCards() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {STANDING_ACTIVITIES.map((s, i) => {
        const detail = detailFor(s);
        return (
          <Card key={s.id} delay={0.04 * i}>
            <h2 className="font-display text-xl text-gold">{s.title}</h2>
            <p className="mt-1 text-sm text-mist">{s.when}</p>
            <p className="mt-3 font-medium text-foreground">{lineFor(s)}</p>
            {detail && <p className="mt-2 text-sm text-mist">{detail}</p>}
          </Card>
        );
      })}
    </div>
  );
}
