import { EventsManager } from "@/components/admin";

export default function AdminEventsPage() {
  return (
    <div>
      <h1 className="font-display text-2xl text-gold-bright">Event manager</h1>
      <p className="mt-2 text-mist max-w-2xl">
        Create and maintain one-off or special sect events. They appear to everyone on the{" "}
        <a href="/schedule" className="text-gold underline">Schedule</a> page, at the top in{" "}
        <strong>Community events</strong>, with date, time, host, and countdown. Use your own time when
        creating rows; the site shows them in each visitor&apos;s local time zone.
      </p>
      <div className="mt-6">
        <EventsManager />
      </div>
    </div>
  );
}
