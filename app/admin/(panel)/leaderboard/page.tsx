import { LeaderboardManager } from "@/components/admin-leaderboard-manager";

export default function AdminLeaderboardPage() {
  return (
    <div>
      <h1 className="font-display text-2xl text-gold-bright">Leaderboard</h1>
      <p className="mt-2 text-mist">Update contributions. The public Leaderboard page sorts by amount (highest first).</p>
      <div className="mt-6">
        <LeaderboardManager />
      </div>
    </div>
  );
}
