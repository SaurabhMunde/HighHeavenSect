-- Guild War site signups & team staging (depends on public.is_admin())

create table if not exists public.guild_war_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  scheduled_start_at timestamptz not null,
  purge_at timestamptz not null,
  signup_template_default int not null default 3,
  discord_message_id text,
  discord_scheduled_event_id text,
  created_at timestamptz not null default now(),
  constraint signup_template_default_range check (signup_template_default between 1 and 99)
);

comment on table public.guild_war_events is 'Active/public while purge_at > now(); auto-purged after purge_at.';

create table if not exists public.guild_war_signups (
  id uuid primary key default gen_random_uuid(),
  war_event_id uuid not null references public.guild_war_events (id) on delete cascade,
  participant_name text not null,
  duty_role text not null check (duty_role in ('dps', 'tank', 'heal', 'flex')),
  created_at timestamptz not null default now(),
  constraint signup_name_nonempty check (length(trim(participant_name)) > 0),
  constraint signup_name_max check (char_length(participant_name) <= 64)
);

create unique index if not exists guild_war_signups_name_ci
  on public.guild_war_signups (war_event_id, lower(trim(participant_name)));

create index if not exists guild_war_signups_event on public.guild_war_signups (war_event_id);

create table if not exists public.guild_war_teams (
  id uuid primary key default gen_random_uuid(),
  war_event_id uuid not null references public.guild_war_events (id) on delete cascade,
  label text not null default 'Team',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists guild_war_teams_event on public.guild_war_teams (war_event_id);

create table if not exists public.guild_war_team_assignments (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.guild_war_teams (id) on delete cascade,
  signup_id uuid not null references public.guild_war_signups (id) on delete cascade,
  assigned_at timestamptz not null default now(),
  unique (signup_id)
);

create index if not exists guild_war_team_assign_team on public.guild_war_team_assignments (team_id);

create or replace function public.set_guild_war_purge_at()
returns trigger
language plpgsql
as $$
begin
  new.purge_at := new.scheduled_start_at + interval '3 hours';
  return new;
end;
$$;

drop trigger if exists trg_set_guild_war_purge_at on public.guild_war_events;
create trigger trg_set_guild_war_purge_at
before insert or update of scheduled_start_at on public.guild_war_events
for each row execute function public.set_guild_war_purge_at();

alter table public.guild_war_events enable row level security;
alter table public.guild_war_signups enable row level security;
alter table public.guild_war_teams enable row level security;
alter table public.guild_war_team_assignments enable row level security;

create policy "guild_war_events_public_select_active"
on public.guild_war_events for select to anon, authenticated
using (purge_at > now());

create policy "guild_war_events_admin_all"
on public.guild_war_events for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "guild_war_signups_public_select_active"
on public.guild_war_signups for select to anon, authenticated
using (
  exists (
    select 1 from public.guild_war_events e
    where e.id = war_event_id and e.purge_at > now()
  )
);

create policy "guild_war_signups_admin_all"
on public.guild_war_signups for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "guild_war_signups_no_direct_insert"
on public.guild_war_signups for insert to anon, authenticated
with check (false);

create policy "guild_war_signups_no_direct_update"
on public.guild_war_signups for update to anon, authenticated using (false);

create policy "guild_war_signups_no_direct_delete"
on public.guild_war_signups for delete to anon, authenticated using (false);

create policy "guild_war_teams_public_select_active"
on public.guild_war_teams for select to anon, authenticated
using (
  exists (
    select 1 from public.guild_war_events e
    where e.id = war_event_id and e.purge_at > now()
  )
);

create policy "guild_war_teams_admin_insert"
on public.guild_war_teams for insert to authenticated with check (public.is_admin());

create policy "guild_war_teams_admin_update"
on public.guild_war_teams for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "guild_war_teams_admin_delete"
on public.guild_war_teams for delete to authenticated using (public.is_admin());

create policy "guild_war_assign_public_select_active"
on public.guild_war_team_assignments for select to anon, authenticated
using (
  exists (
    select 1
    from public.guild_war_teams t
    join public.guild_war_events e on e.id = t.war_event_id
    where t.id = team_id and e.purge_at > now()
  )
);

create policy "guild_war_assign_admin_insert"
on public.guild_war_team_assignments for insert to authenticated with check (public.is_admin());

create policy "guild_war_assign_admin_update"
on public.guild_war_team_assignments for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "guild_war_assign_admin_delete"
on public.guild_war_team_assignments for delete to authenticated using (public.is_admin());

create or replace function public.guild_war_try_signup(
  p_war_event_id uuid,
  p_participant_name text,
  p_duty_role text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_purge timestamptz;
  v_now timestamptz := now();
  v_count int;
  v_name text := trim(both from p_participant_name);
  v_id uuid;
begin
  if v_name is null or length(v_name) = 0 then
    raise exception 'NAME_REQUIRED';
  end if;

  if p_duty_role is null or p_duty_role not in ('dps', 'tank', 'heal', 'flex') then
    raise exception 'INVALID_ROLE';
  end if;

  select e.purge_at into v_purge
  from public.guild_war_events e
  where e.id = p_war_event_id
  for update;

  if v_purge is null then
    raise exception 'WAR_NOT_FOUND';
  end if;

  if v_purge <= v_now then
    raise exception 'WAR_CLOSED';
  end if;

  select count(*) into v_count from public.guild_war_signups s where s.war_event_id = p_war_event_id;
  if v_count >= 30 then
    raise exception 'WAR_FULL';
  end if;

  insert into public.guild_war_signups (war_event_id, participant_name, duty_role)
  values (p_war_event_id, v_name, p_duty_role)
  returning id into v_id;

  return v_id;
exception
  when unique_violation then
    raise exception 'NAME_TAKEN';
end;
$$;

grant execute on function public.guild_war_try_signup(uuid, text, text) to anon, authenticated;
