import { WuxiaShell } from "@/components/layout";
import { Card } from "@/components/ui";
import { MEMBERS } from "@/lib/members";

export default function MembersPage() {
  return (
    <WuxiaShell>
      <div className="mb-8 text-center">
        <h1 className="font-display text-3xl text-gold-bright">Members</h1>
        <p className="mt-2 text-mist">Current active roster</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {MEMBERS.map((m, i) => (
          <Card key={m.inGame} delay={Math.min(0.02 * i, 0.4)}>
            <p className="font-medium text-foreground">{m.inGame}</p>
            <p className="mt-1 text-sm text-mist">Discord: {m.discord}</p>
            {m.role && (
              <p className="mt-2 text-xs text-gold-dim">Role: {m.role}</p>
            )}
          </Card>
        ))}
      </div>
    </WuxiaShell>
  );
}
