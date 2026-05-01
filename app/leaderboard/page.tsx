import { permanentRedirect } from "next/navigation";

/** Legacy leaderboard feature moved to guild war signup */
export default function LeaderboardLegacyRedirectPage() {
  permanentRedirect("/guild-war");
}
