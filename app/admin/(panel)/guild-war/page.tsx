import { AdminGuildWarConsole } from "@/components/guild-war/admin-guild-war-console";

export default function AdminGuildWarPage() {
  return (
    <div>
      <h1 className="font-display text-2xl text-gold-bright">Guild war operations</h1>
      <p className="mt-2 max-w-3xl text-mist">
        Create signup boards with shareable links, assign battle roles on the ledger, arrange disciples into formations ·
        auto-purges{" "}
        <span className="text-gold-bright">3 hours</span> after the IST start timestamp (or purge manually anytime).
      </p>
      <div className="mt-8">
        <AdminGuildWarConsole />
      </div>
    </div>
  );
}
