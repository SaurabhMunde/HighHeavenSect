import { purgeExpiredGuildWarEvents } from "@/lib/guild-war/purge-expired";

/** Optional ? Vercel / external cron hits this with Bearer CRON_SECRET */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  const out = await purgeExpiredGuildWarEvents();
  return Response.json(out);
}
