/**
 * Canonical site URL for metadata, sitemap, and JSON-LD.
 * Set `NEXT_PUBLIC_SITE_URL` in Vercel (e.g. https://high-heaven-sect.vercel.app or your custom domain).
 */
export function getSiteUrl() {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  if (process.env.VERCEL_URL) {
    const host = process.env.VERCEL_URL.replace(/^https?:\/\//, "");
    return `https://${host}`;
  }
  if (process.env.NODE_ENV === "development") {
    return "http://localhost:3000";
  }
  return "https://high-heaven-sect.vercel.app";
}
