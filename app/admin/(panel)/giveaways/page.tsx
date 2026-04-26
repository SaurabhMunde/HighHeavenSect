import { GiveawaysManager } from "@/components/admin-giveaways-manager";

export default function AdminGiveawaysPage() {
  return (
    <div>
      <h1 className="font-display text-2xl text-gold-bright">Giveaways</h1>
      <p className="mt-2 text-mist">Create a reward, add entrants, and pick winners at random.</p>
      <div className="mt-6">
        <GiveawaysManager />
      </div>
    </div>
  );
}
