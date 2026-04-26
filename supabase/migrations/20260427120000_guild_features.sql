-- Quizzes: explicit open/close window; attempts; giveaway signups; activity log
-- Run in Supabase SQL after the initial migration.

alter table public.quizzes
  add column if not exists opens_at timestamptz,
  add column if not exists closes_at timestamptz;

update public.quizzes
set opens_at = scheduled_at
where opens_at is null and scheduled_at is not null;

alter table public.giveaways
  add column if not exists signup_ends_at timestamptz;

create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes on delete cascade,
  player_key text not null,
  in_game_name text not null,
  score int not null,
  max_score int not null,
  created_at timestamptz not null default now(),
  unique (quiz_id, player_key)
);

create index if not exists quiz_attempts_quiz_id on public.quiz_attempts (quiz_id);
create index if not exists quiz_attempts_quiz_score on public.quiz_attempts (quiz_id, score desc, created_at asc);

create table if not exists public.giveaway_signups (
  id uuid primary key default gen_random_uuid(),
  giveaway_id uuid not null references public.giveaways on delete cascade,
  in_game_name text not null,
  player_key text not null,
  created_at timestamptz not null default now(),
  unique (giveaway_id, player_key)
);

create unique index if not exists giveaway_signups_name_per_giveaway
  on public.giveaway_signups (giveaway_id, lower(trim(in_game_name)));

create table if not exists public.guild_logs (
  id uuid primary key default gen_random_uuid(),
  message text not null,
  kind text not null default 'action',
  created_at timestamptz not null default now()
);

alter table public.quiz_attempts enable row level security;
alter table public.giveaway_signups enable row level security;
alter table public.guild_logs enable row level security;

-- Everyone can read attempts (for public winner); one insert per player_key per quiz
create policy "quiz_attempts_select" on public.quiz_attempts for select using (true);
create policy "quiz_attempts_insert" on public.quiz_attempts for insert with check (true);
create policy "quiz_attempts_no_update" on public.quiz_attempts for update using (false);
create policy "quiz_attempts_no_delete" on public.quiz_attempts for delete using (public.is_admin());

create policy "giveaway_signups_select" on public.giveaway_signups for select using (true);
create policy "giveaway_signups_insert" on public.giveaway_signups for insert with check (true);
create policy "giveaway_signups_no_update" on public.giveaway_signups for update using (false);
create policy "giveaway_signups_no_delete" on public.giveaway_signups for delete using (public.is_admin());

create policy "guild_logs_select" on public.guild_logs for select using (true);
create policy "guild_logs_insert" on public.guild_logs for insert with check (public.is_admin());
create policy "guild_logs_delete" on public.guild_logs for delete using (public.is_admin());
