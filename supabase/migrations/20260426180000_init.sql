-- HighHeavenSect guild site — run in Supabase SQL editor or CLI
-- After first admin signs up, insert: insert into public.admin_users (user_id) values ('<uuid-from-auth.users>');

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  event_date date not null,
  event_time time,
  host text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.quizzes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  time_limit_seconds int not null default 20,
  join_code text not null unique default encode(gen_random_bytes(4), 'hex'),
  scheduled_at timestamptz,
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'live', 'ended')),
  created_at timestamptz not null default now()
);

create table if not exists public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes on delete cascade,
  question text not null,
  options jsonb not null,
  correct_index int not null,
  sort_order int not null default 0
);

create index if not exists quiz_questions_quiz_id on public.quiz_questions (quiz_id);

create table if not exists public.member_contributions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  amount numeric(14,2) not null default 0,
  updated_at timestamptz not null default now()
);

create unique index if not exists member_contributions_name on public.member_contributions (lower(name));

create table if not exists public.giveaways (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  reward text not null,
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now()
);

create table if not exists public.giveaway_entries (
  id uuid primary key default gen_random_uuid(),
  giveaway_id uuid not null references public.giveaways on delete cascade,
  member_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.giveaway_winners (
  id uuid primary key default gen_random_uuid(),
  giveaway_id uuid not null references public.giveaways on delete cascade,
  winner_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.recruitments (
  id uuid primary key default gen_random_uuid(),
  recruiter text not null,
  recruited text not null,
  joined_at date not null default (timezone('utc', now()))::date,
  last_active date,
  active_within_5_days boolean not null default true,
  created_at timestamptz not null default now()
);

-- RLS
alter table public.admin_users enable row level security;
alter table public.events enable row level security;
alter table public.quizzes enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.member_contributions enable row level security;
alter table public.giveaways enable row level security;
alter table public.giveaway_entries enable row level security;
alter table public.giveaway_winners enable row level security;
alter table public.recruitments enable row level security;

-- Helper: is admin
create or replace function public.is_admin() returns boolean
  language sql stable security definer
  set search_path = public
as $$
  select exists (
    select 1 from public.admin_users a where a.user_id = auth.uid()
  );
$$;

-- admin_users: only self-read for joined admins (optional) — keep locked
create policy "admin_users_select_own" on public.admin_users
  for select using (auth.uid() = user_id);

-- events: public read, admin write
create policy "events_select" on public.events for select using (true);
create policy "events_insert" on public.events for insert with check (public.is_admin());
create policy "events_update" on public.events for update using (public.is_admin());
create policy "events_delete" on public.events for delete using (public.is_admin());

-- quizzes & questions: public read live/scheduled for join page; full read for admin
create policy "quizzes_select" on public.quizzes for select using (true);
create policy "quizzes_insert" on public.quizzes for insert with check (public.is_admin());
create policy "quizzes_update" on public.quizzes for update using (public.is_admin());
create policy "quizzes_delete" on public.quizzes for delete using (public.is_admin());

create policy "quiz_questions_select" on public.quiz_questions for select using (true);
create policy "quiz_questions_insert" on public.quiz_questions for insert with check (public.is_admin());
create policy "quiz_questions_update" on public.quiz_questions for update using (public.is_admin());
create policy "quiz_questions_delete" on public.quiz_questions for delete using (public.is_admin());

-- contributions: public read, admin write
create policy "contributions_select" on public.member_contributions for select using (true);
create policy "contributions_insert" on public.member_contributions for insert with check (public.is_admin());
create policy "contributions_update" on public.member_contributions for update using (public.is_admin());
create policy "contributions_delete" on public.member_contributions for delete using (public.is_admin());

-- giveaways
create policy "giveaways_select" on public.giveaways for select using (true);
create policy "giveaways_insert" on public.giveaways for insert with check (public.is_admin());
create policy "giveaways_update" on public.giveaways for update using (public.is_admin());
create policy "giveaways_delete" on public.giveaways for delete using (public.is_admin());
create policy "giveaway_entries_select" on public.giveaway_entries for select using (true);
create policy "giveaway_entries_insert" on public.giveaway_entries for insert with check (public.is_admin());
create policy "giveaway_entries_update" on public.giveaway_entries for update using (public.is_admin());
create policy "giveaway_entries_delete" on public.giveaway_entries for delete using (public.is_admin());
create policy "giveaway_winners_select" on public.giveaway_winners for select using (true);
create policy "giveaway_winners_insert" on public.giveaway_winners for insert with check (public.is_admin());
create policy "giveaway_winners_update" on public.giveaway_winners for update using (public.is_admin());
create policy "giveaway_winners_delete" on public.giveaway_winners for delete using (public.is_admin());

-- recruitments: admin only (sensitive)
create policy "recruitments_all" on public.recruitments for all using (public.is_admin()) with check (public.is_admin());
