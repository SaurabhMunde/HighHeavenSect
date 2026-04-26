import { createBrowserClient } from "@supabase/ssr";

function getOrThrow() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key || url === "undefined" || key === "undefined") {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Restart the dev server after editing .env.local.",
    );
  }
  if (!url.startsWith("https://")) {
    throw new Error(
      `Use an https:// URL for NEXT_PUBLIC_SUPABASE_URL (see Supabase → Project Settings → API).`,
    );
  }
  return { url, key };
}

export function createClient() {
  const { url, key } = getOrThrow();
  return createBrowserClient(url, key);
}
