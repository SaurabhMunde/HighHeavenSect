import type { NextConfig } from "next";

const supabaseHostname = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

/** Skip `next/image` optimization in dev: the optimizer aborts upstream fetches after 7s, so large PNGs from Storage often time out locally. Production still optimizes on Vercel. */
const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  serverExternalPackages: ["discord.js", "@discordjs/ws", "@discordjs/rest"],
  images: {
    unoptimized: isDev,
    formats: ["image/avif", "image/webp"],
    // Remote Supabase objects are often updated in-place; long TTL makes `next/image` sticky on old bytes.
    minimumCacheTTL: 60 * 60 * 24,
    remotePatterns: supabaseHostname
      ? [
          {
            protocol: "https",
            hostname: supabaseHostname,
            pathname: "/storage/v1/object/**",
          },
        ]
      : [],
  },
  // Help Turbopack/Webpack always inline public Supabase vars (avoids client using wrong/empty URL → ERR_CONNECTION_REFUSED)
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
};

export default nextConfig;
