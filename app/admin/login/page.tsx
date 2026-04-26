import { Suspense } from "react";
import { AdminLoginForm } from "@/components/admin-login-form";

export default function AdminLoginPage() {
  return (
    <div className="mx-auto w-full max-w-md rounded-2xl border border-gold/20 bg-card/85 p-6 shadow-card backdrop-blur-md md:p-8">
      <h1 className="text-center font-display text-2xl text-gold-bright">Sect login</h1>
      <p className="mt-3 text-center text-sm text-mist">
        This is the <strong className="text-foreground/90">officer</strong> area for events, quizzes, giveaways, recruitment
        tracking, and the sect log. Sign in with the email and password you were given, then be listed in
        the Supabase table <code className="text-gold/90">admin_users</code> (leadership can add you after you create
        a user in Authentication).
      </p>
      <div className="mt-6">
        <Suspense fallback={<p className="text-sm text-mist">Loading…</p>}>
          <AdminLoginForm />
        </Suspense>
      </div>
    </div>
  );
}
