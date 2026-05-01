import type { Metadata } from "next";
import { DiscordMembersRoster } from "@/components/members/discord-members-roster";
import { WuxiaShell } from "@/components/layout";

export const metadata: Metadata = {
  title: "Members",
  description:
    "Meet the active roster of HighHeavenSect — a casual Where Winds Meet (WWM) SEA English guild and community.",
  alternates: { canonical: "/members" },
};

export default function MembersPage() {
  return (
    <WuxiaShell>
      <div className="mb-8 text-center">
        <h1 className="font-display text-3xl text-gold-bright">Members</h1>
        <p className="mt-2 text-mist">Current active roster</p>
      </div>
      <DiscordMembersRoster />
    </WuxiaShell>
  );
}
