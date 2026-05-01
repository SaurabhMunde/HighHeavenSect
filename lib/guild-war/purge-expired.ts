import { createAdminClient } from "@/lib/supabase/admin";

/** Hard-delete wars past auto-expiry (+3h from start); cascades signups & teams */
export async function purgeExpiredGuildWarEvents(): Promise<{ removed: number; error?: string }> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("guild_war_events")
      .delete()
      .lte("purge_at", new Date().toISOString())
      .select("id");
    if (error) return { removed: 0, error: error.message };
    return { removed: data?.length ?? 0 };
  } catch (e) {
    return {
      removed: 0,
      error: e instanceof Error ? e.message : "purge failed",
    };
  }
}
