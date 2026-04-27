import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/components/admin";
import { createClient } from "@/lib/supabase/server";

/** Only allow same-origin relative paths (avoids open redirects on `next`). */
function safeNext(raw: string | undefined): string {
  if (!raw || typeof raw !== "string") return "/admin";
  const t = raw.trim();
  if (!t.startsWith("/") || t.startsWith("//")) return "/admin";
  if (t.includes("://")) return "/admin";
  return t;
}

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next: nextParam } = await searchParams;
  const next = safeNext(nextParam);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: row } = await supabase
      .from("admin_users")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (row) {
      redirect(next);
    }
    redirect("/admin/unauthorized");
  }

  return (
    <div className="mx-auto w-full max-w-md rounded-2xl border border-gold/20 bg-card/85 p-6 shadow-card backdrop-blur-md md:p-8">
      <h1 className="text-center font-display text-2xl text-gold-bright">Sect login</h1>
      <p className="mt-3 text-center text-sm text-mist">
        This is the <strong className="text-foreground/90">officer</strong> area for events, quizzes, giveaways, recruitment
        tracking, and the sect log. Sign in with the email and password you were given, then be listed in
        the Supabase table <code className="text-gold/90">admin_users</code> (leadership can add you after you create
        a user in Authentication).
      </p>
      <p className="mt-2 text-center text-xs text-mist/90">
        Already signed in? Use the site <strong className="text-foreground/80">Admin</strong> link to open the
        officer dashboard. Session length is set in the Supabase project (tokens refresh in the background).
      </p>
      <div className="mt-6">
        <Suspense fallback={<p className="text-sm text-mist">Loading…</p>}>
          <AdminLoginForm />
        </Suspense>
      </div>
    </div>
  );
}
