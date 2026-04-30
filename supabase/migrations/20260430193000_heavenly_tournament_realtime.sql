alter table public.quizzes
  add column if not exists start_time timestamptz,
  add column if not exists waiting_time_seconds int not null default 20,
  add column if not exists time_per_question_seconds int not null default 20;

update public.quizzes
set start_time = coalesce(start_time, opens_at, scheduled_at)
where start_time is null;

update public.quizzes
set time_per_question_seconds = coalesce(time_per_question_seconds, time_limit_seconds, 20);

alter table public.quiz_tournament_sessions add column if not exists scope text not null default 'live';
alter table public.quiz_tournament_answers add column if not exists scope text not null default 'live';

alter table public.quiz_tournament_sessions drop constraint if exists quiz_tournament_sessions_quiz_id_player_key_key;
alter table public.quiz_tournament_sessions drop constraint if exists quiz_tournament_sessions_quiz_scope_player_key_key;
alter table public.quiz_tournament_sessions add constraint quiz_tournament_sessions_quiz_scope_player_key_key unique (quiz_id, scope, player_key);

alter table public.quiz_tournament_answers drop constraint if exists quiz_tournament_answers_quiz_id_question_id_player_key_key;
alter table public.quiz_tournament_answers drop constraint if exists quiz_tournament_answers_quiz_scope_question_player_key_key;
alter table public.quiz_tournament_answers add constraint quiz_tournament_answers_quiz_scope_question_player_key_key unique (quiz_id, scope, question_id, player_key);

create table if not exists public.quiz_tournament_games (
  quiz_id uuid not null references public.quizzes on delete cascade,
  scope text not null default 'live',
  phase text not null default 'waiting' check (phase in ('waiting', 'question', 'leaderboard', 'ended')),
  question_index int not null default 0,
  waiting_ends_at timestamptz,
  question_started_at timestamptz,
  question_ends_at timestamptz,
  transition_ends_at timestamptz,
  started_at timestamptz,
  ended_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (quiz_id, scope)
);

alter table public.quiz_tournament_games enable row level security;

drop policy if exists "quiz_tournament_games_select" on public.quiz_tournament_games;
create policy "quiz_tournament_games_select"
  on public.quiz_tournament_games for select using (true);

drop policy if exists "quiz_tournament_games_insert" on public.quiz_tournament_games;
create policy "quiz_tournament_games_insert"
  on public.quiz_tournament_games for insert with check (true);

drop policy if exists "quiz_tournament_games_update" on public.quiz_tournament_games;
create policy "quiz_tournament_games_update"
  on public.quiz_tournament_games for update using (true) with check (true);

drop policy if exists "quiz_tournament_games_delete_admin" on public.quiz_tournament_games;
create policy "quiz_tournament_games_delete_admin"
  on public.quiz_tournament_games for delete using (public.is_admin());

create or replace function public.quiz_tournament_join(
  p_quiz_id uuid,
  p_player_key text,
  p_in_game_name text,
  p_is_simulation boolean default false,
  p_scope text default 'live'
)
returns table(ok boolean, message text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quiz public.quizzes%rowtype;
  v_game public.quiz_tournament_games%rowtype;
  v_waiting_ends timestamptz;
begin
  if p_scope not in ('live', 'simulation') then
    return query select false, 'Invalid room scope';
    return;
  end if;

  select * into v_quiz from public.quizzes where id = p_quiz_id;
  if not found then
    return query select false, 'Quiz not found';
    return;
  end if;
  if v_quiz.quiz_type <> 'tournament' then
    return query select false, 'Not a tournament quiz';
    return;
  end if;
  if v_quiz.status = 'simulation' and not p_is_simulation then
    return query select false, 'Simulation-only room';
    return;
  end if;
  if v_quiz.status not in ('live', 'scheduled', 'simulation') then
    return query select false, 'Quiz is not open';
    return;
  end if;

  select * into v_game from public.quiz_tournament_games where quiz_id = p_quiz_id and scope = p_scope;
  if not found then
    v_waiting_ends := (
      case
        when p_scope = 'simulation' or p_is_simulation or v_quiz.status = 'simulation' then now()
        else coalesce(v_quiz.start_time, now())
      end
    ) + make_interval(secs => greatest(v_quiz.waiting_time_seconds, 1));
    insert into public.quiz_tournament_games (quiz_id, scope, phase, question_index, waiting_ends_at, updated_at)
    values (p_quiz_id, p_scope, 'waiting', 0, v_waiting_ends, now())
    returning * into v_game;
  end if;

  if p_scope = 'simulation' and v_game.phase <> 'waiting' then
    delete from public.quiz_tournament_answers where quiz_id = p_quiz_id and scope = p_scope;
    delete from public.quiz_tournament_sessions where quiz_id = p_quiz_id and scope = p_scope;
    update public.quiz_tournament_games
    set phase = 'waiting',
        question_index = 0,
        waiting_ends_at = now() + make_interval(secs => greatest(v_quiz.waiting_time_seconds, 1)),
        question_started_at = null,
        question_ends_at = null,
        transition_ends_at = null,
        ended_at = null,
        updated_at = now()
    where quiz_id = p_quiz_id and scope = p_scope
    returning * into v_game;
  end if;

  if v_game.phase = 'waiting' and (p_scope = 'simulation' or p_is_simulation or v_quiz.status = 'simulation') then
    update public.quiz_tournament_games
    set waiting_ends_at = now() + make_interval(secs => greatest(v_quiz.waiting_time_seconds, 1)),
        updated_at = now()
    where quiz_id = p_quiz_id and scope = p_scope
    returning * into v_game;
  end if;

  if v_game.phase <> 'waiting' then
    return query select false, 'Tournament already started. Late joins are locked.';
    return;
  end if;

  if exists (
    select 1
    from public.quiz_tournament_sessions s
    where s.quiz_id = p_quiz_id
      and s.scope = p_scope
      and lower(trim(s.in_game_name)) = lower(trim(p_in_game_name))
      and s.player_key <> p_player_key
  ) then
    return query select false, 'Username already taken in this lobby';
    return;
  end if;

  insert into public.quiz_tournament_sessions (quiz_id, scope, player_key, in_game_name, score, current_question, updated_at)
  values (p_quiz_id, p_scope, p_player_key, left(trim(p_in_game_name), 64), 0, 0, now())
  on conflict (quiz_id, scope, player_key)
  do update set
    in_game_name = excluded.in_game_name,
    updated_at = now();

  return query select true, 'Joined';
end;
$$;

grant execute on function public.quiz_tournament_join(uuid, text, text, boolean, text) to anon, authenticated;

create or replace function public.quiz_tournament_tick(p_quiz_id uuid, p_scope text default 'live')
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_game public.quiz_tournament_games%rowtype;
  v_quiz public.quizzes%rowtype;
  v_total_questions int;
begin
  if p_scope not in ('live', 'simulation') then
    return;
  end if;
  select * into v_game from public.quiz_tournament_games where quiz_id = p_quiz_id and scope = p_scope;
  if not found then
    return;
  end if;
  select * into v_quiz from public.quizzes where id = p_quiz_id;
  if not found then
    return;
  end if;
  select count(*) into v_total_questions from public.quiz_questions where quiz_id = p_quiz_id;
  if v_total_questions < 1 then
    return;
  end if;

  if v_game.phase = 'waiting' and v_game.waiting_ends_at is not null and now() >= v_game.waiting_ends_at then
    update public.quiz_tournament_games
    set phase = 'question',
        question_index = 0,
        question_started_at = now(),
        question_ends_at = now() + make_interval(secs => greatest(v_quiz.time_per_question_seconds, 1)),
        started_at = coalesce(started_at, now()),
        transition_ends_at = null,
        updated_at = now()
    where quiz_id = p_quiz_id and scope = p_scope;
    return;
  end if;

  if v_game.phase = 'question' and v_game.question_ends_at is not null and now() >= v_game.question_ends_at then
    update public.quiz_tournament_games
    set phase = 'leaderboard',
        transition_ends_at = now() + interval '3 seconds',
        updated_at = now()
    where quiz_id = p_quiz_id and scope = p_scope;
    return;
  end if;

  if v_game.phase = 'leaderboard' and v_game.transition_ends_at is not null and now() >= v_game.transition_ends_at then
    if v_game.question_index + 1 >= v_total_questions then
      update public.quiz_tournament_games
      set phase = 'ended',
          ended_at = now(),
          question_started_at = null,
          question_ends_at = null,
          transition_ends_at = null,
          updated_at = now()
      where quiz_id = p_quiz_id and scope = p_scope;
    else
      update public.quiz_tournament_games
      set phase = 'question',
          question_index = v_game.question_index + 1,
          question_started_at = now(),
          question_ends_at = now() + make_interval(secs => greatest(v_quiz.time_per_question_seconds, 1)),
          transition_ends_at = null,
          updated_at = now()
      where quiz_id = p_quiz_id and scope = p_scope;
    end if;
  end if;
end;
$$;

grant execute on function public.quiz_tournament_tick(uuid, text) to anon, authenticated;

create or replace function public.quiz_tournament_submit_answer(
  p_quiz_id uuid,
  p_question_id uuid,
  p_question_index int,
  p_player_key text,
  p_answer_index int,
  p_response_ms int,
  p_time_per_question int,
  p_scope text default 'live'
)
returns table(accepted boolean, is_correct boolean, points int, score int, message text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_game public.quiz_tournament_games%rowtype;
  v_quiz public.quizzes%rowtype;
  v_correct int;
  v_is_correct boolean;
  v_points int;
  v_remaining_ms int;
  v_score int;
begin
  if p_scope not in ('live', 'simulation') then
    return query select false, false, 0, 0, 'Invalid room scope';
    return;
  end if;
  select * into v_game from public.quiz_tournament_games where quiz_id = p_quiz_id and scope = p_scope;
  if not found then
    return query select false, false, 0, 0, 'Game state not found';
    return;
  end if;
  if v_game.phase <> 'question' then
    return query select false, false, 0, 0, 'Not in question phase';
    return;
  end if;
  if v_game.question_index <> p_question_index then
    return query select false, false, 0, 0, 'Question index mismatch';
    return;
  end if;
  if v_game.question_ends_at is not null and now() > v_game.question_ends_at then
    return query select false, false, 0, 0, 'Question timer elapsed';
    return;
  end if;

  select * into v_quiz from public.quizzes where id = p_quiz_id;
  if not found then
    return query select false, false, 0, 0, 'Quiz not found';
    return;
  end if;

  select correct_index into v_correct
  from public.quiz_questions
  where id = p_question_id and quiz_id = p_quiz_id;

  if not found then
    return query select false, false, 0, 0, 'Question not found';
    return;
  end if;

  if exists (
    select 1
    from public.quiz_tournament_answers
    where quiz_id = p_quiz_id and scope = p_scope and question_id = p_question_id and player_key = p_player_key
  ) then
    return query select false, false, 0, 0, 'Answer already submitted';
    return;
  end if;

  v_is_correct := p_answer_index = v_correct;
  v_remaining_ms := greatest(0, floor(extract(epoch from (v_game.question_ends_at - now())) * 1000)::int);
  if v_is_correct then
    v_points := 100 + floor((v_remaining_ms::numeric / greatest(1, p_time_per_question * 1000)::numeric) * 900)::int;
  else
    v_points := 0;
  end if;

  insert into public.quiz_tournament_answers (
    quiz_id, scope, question_id, player_key, answer_index, is_correct, points, response_ms
  ) values (
    p_quiz_id, p_scope, p_question_id, p_player_key, p_answer_index, v_is_correct, v_points, greatest(0, p_response_ms)
  );

  update public.quiz_tournament_sessions as s
  set score = s.score + v_points,
      current_question = greatest(s.current_question, p_question_index + 1),
      updated_at = now()
  where s.quiz_id = p_quiz_id and s.scope = p_scope and s.player_key = p_player_key
  returning s.score into v_score;

  if p_scope = 'live' and v_game.question_index + 1 = (
    select count(*) from public.quiz_questions where quiz_id = p_quiz_id
  ) and v_quiz.status <> 'simulation' then
    insert into public.quiz_attempts (quiz_id, player_key, in_game_name, score, max_score)
    select s.quiz_id, s.player_key, s.in_game_name, s.score, (select count(*) from public.quiz_questions where quiz_id = p_quiz_id) * 1000
    from public.quiz_tournament_sessions s
    where s.quiz_id = p_quiz_id and s.scope = p_scope and s.player_key = p_player_key
    on conflict (quiz_id, player_key) do nothing;
  end if;

  return query select true, v_is_correct, v_points, coalesce(v_score, 0), 'Answer accepted';
end;
$$;

grant execute on function public.quiz_tournament_submit_answer(uuid, uuid, int, text, int, int, int, text) to anon, authenticated;
