-- Publish guild war tables to Supabase Realtime (instant admin/public UI updates).
-- If a line errors with "already member of publication", skip that line in the SQL editor.

alter publication supabase_realtime add table public.guild_war_signups;
alter publication supabase_realtime add table public.guild_war_teams;
alter publication supabase_realtime add table public.guild_war_team_assignments;
