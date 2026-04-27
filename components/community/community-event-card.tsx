"use client";

import { Card } from "@/components/ui";
import { PublicCountdown } from "./public-countdown";

type Ev = {
  id: string;
  title: string;
  description: string;
  event_date: string;
  event_time: string | null;
  host: string;
};

export function CommunityEventCard({
  ev,
  startIso,
  delay,
}: {
  ev: Ev;
  startIso: string | null;
  delay: number;
}) {
  const start = startIso ? new Date(startIso) : null;
  const localLine = start
    ? start.toLocaleString(undefined, {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : `${ev.event_date} (no time set)`;

  return (
    <Card delay={delay}>
      <h3 className="font-display text-lg text-gold-bright">{ev.title}</h3>
      <p className="text-sm text-mist">
        {localLine} · host: {ev.host}
      </p>
      {startIso && <PublicCountdown targetIso={startIso} />}
      {ev.description && (
        <p className="mt-2 whitespace-pre-wrap text-sm text-mist/90">
          {ev.description}
        </p>
      )}
    </Card>
  );
}
