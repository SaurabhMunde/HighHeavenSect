import { createClient } from "@supabase/supabase-js";

type AdminClient = ReturnType<typeof createClient>;
let cached: AdminClient | null = null;

export function createAdminClient() {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !key || url === "undefined" || key === "undefined") {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Add the service role key to the server environment before using gallery storage.",
    );
  }

  cached = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return cached;
}
