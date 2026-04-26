"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function AdminSignOut() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={async () => {
        const s = createClient();
        await s.auth.signOut();
        router.push("/admin/login");
        router.refresh();
      }}
      className="rounded-md px-2 py-1 text-mist transition hover:text-foreground"
    >
      Sign out
    </button>
  );
}
