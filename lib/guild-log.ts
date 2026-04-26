import type { SupabaseClient } from "@supabase/supabase-js";

export async function logGuildAction(
  supabase: SupabaseClient,
  message: string,
  kind: string = "action",
) {
  await supabase.from("guild_logs").insert({ message, kind });
}
