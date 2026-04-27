import type { Metadata } from "next";
import Image from "next/image";
import { WuxiaShell } from "@/components/layout";
import { Card } from "@/components/ui";
import { LEADERSHIP } from "@/lib/leadership";

export const metadata: Metadata = {
  title: "Leadership",
  description:
    "Sect head, officers, and elders of HighHeavenSect — Where Winds Meet (WWM) SEA English guild leadership.",
  alternates: { canonical: "/leadership" },
};

export default function LeadershipPage() {
  return (
    <WuxiaShell>
      <div className="mb-8 text-center">
        <h1 className="font-display text-3xl text-gold-bright">Leadership</h1>
        <p className="mt-2 text-mist">The sect&apos;s pathkeepers</p>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {LEADERSHIP.map((L, i) => (
          <Card key={L.name} delay={0.05 * i} className="overflow-hidden p-0">
            <div className="relative aspect-[4/5] w-full bg-void/60">
              <Image
                src={L.image}
                alt={L.name}
                fill
                className="object-cover object-top"
                sizes="(max-width: 640px) 100vw, 33vw"
              />
            </div>
            <div className="p-5">
              <p className="font-display text-lg text-gold-bright">{L.name}</p>
              <p className="text-sm text-gold">{L.role}</p>
              {L.note && <p className="mt-2 text-xs text-mist">{L.note}</p>}
            </div>
          </Card>
        ))}
      </div>
    </WuxiaShell>
  );
}
