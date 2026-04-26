import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <div className="mx-auto max-w-md rounded-2xl border border-amber-500/30 bg-card/80 p-6 text-center shadow-card">
      <h1 className="font-display text-xl text-amber-200">Not in admin roster</h1>
      <p className="mt-2 text-sm text-mist">
        You&apos;re signed in, but your account is not in the{" "}
        <code className="text-gold/90">admin_users</code> table. Ask the sect leader
        to add your user ID.
      </p>
      <Link
        href="/"
        className="mt-6 inline-block text-gold underline transition hover:text-gold-bright"
      >
        Back to public site
      </Link>
    </div>
  );
}
