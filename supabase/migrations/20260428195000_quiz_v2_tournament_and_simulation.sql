-- Quiz v2: add simulation status, quiz types, tournament settings and live session tables.

alter table public.quizzes
  drop constraint if exists quizzes_status_check;

alter table public.quizzes
  add constraint quizzes_status_check
    check (status in ('draft', 'simulation', 'scheduled', 'live', 'ended'));

alter table public.quizzes
  add column if not exists quiz_type text not null default 'trial'
    check (quiz_type in ('trial', 'tournament')),
  add column if not exists join_window_seconds int not null default 45,
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.quiz_tournament_sessions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes on delete cascade,
  player_key text not null,
  in_game_name text not null,
  score int not null default 0,
  current_question int not null default 0,
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (quiz_id, player_key)
);

create index if not exists quiz_tournament_sessions_quiz_idx
  on public.quiz_tournament_sessions (quiz_id, score desc, updated_at asc);

create table if not exists public.quiz_tournament_answers (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes on delete cascade,
  question_id uuid not null references public.quiz_questions on delete cascade,
  player_key text not null,
  answer_index int not null,
  is_correct boolean not null default false,
  points int not null default 0,
  response_ms int not null default 0,
  created_at timestamptz not null default now(),
  unique (quiz_id, question_id, player_key)
);

create index if not exists quiz_tournament_answers_quiz_idx
  on public.quiz_tournament_answers (quiz_id, question_id, points desc, created_at asc);

alter table public.quiz_tournament_sessions enable row level security;
alter table public.quiz_tournament_answers enable row level security;

create policy "quiz_tournament_sessions_select"
  on public.quiz_tournament_sessions for select using (true);
create policy "quiz_tournament_sessions_insert"
  on public.quiz_tournament_sessions for insert with check (true);
create policy "quiz_tournament_sessions_update"
  on public.quiz_tournament_sessions for update using (true) with check (true);
create policy "quiz_tournament_sessions_delete_admin"
  on public.quiz_tournament_sessions for delete using (public.is_admin());

create policy "quiz_tournament_answers_select"
  on public.quiz_tournament_answers for select using (true);
create policy "quiz_tournament_answers_insert"
  on public.quiz_tournament_answers for insert with check (true);
create policy "quiz_tournament_answers_update_none"
  on public.quiz_tournament_answers for update using (false);
create policy "quiz_tournament_answers_delete_admin"
  on public.quiz_tournament_answers for delete using (public.is_admin());
