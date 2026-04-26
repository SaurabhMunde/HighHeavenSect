/**
 * Guild times are authored in India Standard Time (Asia/Kolkata, UTC+5:30).
 * Use these helpers to convert IST wall clocks to the viewer's local display.
 */
const IST_OFFSET = "+05:30";

function pad2(n: number) {
  return n.toString().padStart(2, "0");
}

/** "18:00" or "6" with minutes 0 from parts */
export function istClockToLocalString(
  hour: number,
  minute: number,
  opts: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" },
) {
  const d = new Date(
    `2024-06-15T${pad2(hour)}:${pad2(minute)}:00${IST_OFFSET}`,
  );
  return d.toLocaleString(undefined, opts);
}

/**
 * Officer-entered `event_date` (YYYY-MM-DD) + `event_time` (HH:MM) are stored as
 * IST wall time — same as in-game for SEA/India.
 */
export function eventDateTimeIstToDate(
  eventDate: string,
  eventTime: string | null,
): Date {
  if (eventTime) {
    const t = eventTime.length === 5 && eventTime.includes(":")
      ? `${eventTime}:00`
      : eventTime;
    return new Date(`${eventDate}T${t}${IST_OFFSET}`);
  }
  return new Date(`${eventDate}T23:59:59${IST_OFFSET}`);
}

export function eventDateTimeIstToIsoString(
  eventDate: string,
  eventTime: string | null,
) {
  return eventDateTimeIstToDate(eventDate, eventTime).toISOString();
}

export function compareEventStartIst(
  a: { event_date: string; event_time: string | null },
  b: { event_date: string; event_time: string | null },
) {
  return (
    eventDateTimeIstToDate(a.event_date, a.event_time).getTime() -
    eventDateTimeIstToDate(b.event_date, b.event_time).getTime()
  );
}
