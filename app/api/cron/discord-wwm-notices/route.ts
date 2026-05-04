import { runDiscordWwmScheduledNotices } from "@/lib/discord/run-discord-wwm-notices";
import { createAdminClient } from "@/lib/supabase/admin";

/** Optional: Vercel / external cron with `Authorization: Bearer <CRON_SECRET>`. */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  const admin = createAdminClient();
  const out = await runDiscordWwmScheduledNotices(admin);
  return Response.json(out);
}
