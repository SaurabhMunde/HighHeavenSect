import type { Metadata } from "next";
import Image from "next/image";
import { WuxiaShell } from "@/components/layout";
import { Card } from "@/components/ui";
import { LEADERSHIP } from "@/lib/leadership";

export const metadata: Metadata = {
  title: "Leadership",
  description:
    "Sect head, officers, and elders of HighHeavenSect, Where Winds Meet (WWM) SEA English guild leadership.",
  alternates: { canonical: "/leadership" },
};

export default function LeadershipPage() {
  return (
    <WuxiaShell>
      <div className="mb-8 text-center">
        <h1 className="font-display text-3xl text-gold-bright">Leadership</h1>
        <p className="mt-2 text-mist">The sect&apos;s pathkeepers</p>
      </div>
      <div className="mx-auto grid max-w-6xl gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {LEADERSHIP.map((L, i) => (
          <Card key={L.name} delay={0.05 * i} className="flex h-full flex-col overflow-hidden p-0">
            <div className="relative aspect-[4/5] w-full shrink-0 bg-void/60">
              <Image
                src={L.image}
                alt={L.name}
                fill
                className="object-cover object-top"
                sizes="(max-width: 640px) 100vw, 33vw"
              />
            </div>
            <div className="flex flex-1 flex-col gap-1 p-4 sm:p-5">
              <p className="font-display text-base leading-tight text-gold-bright sm:text-lg">
                {L.name}
              </p>
              <p className="text-[13px] leading-snug text-gold">{L.role}</p>
              <div className="mt-2 flex flex-1 flex-col border-t border-gold/10 pt-2.5">
                {L.note && (
                  <p className="text-xs leading-relaxed text-mist/95">{L.note}</p>
                )}
                <p className="mt-auto pt-3 text-right text-[10px] leading-snug text-mist/75 sm:text-[11px]">
                  IGN: {L.ign ?? L.name}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </WuxiaShell>
  );
}
