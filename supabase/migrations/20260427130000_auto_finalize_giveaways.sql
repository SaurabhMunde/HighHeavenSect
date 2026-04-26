-- Auto-close ended giveaways and pick a random winner.
-- Safe to run repeatedly.

create or replace function public.auto_finalize_giveaways()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  g record;
  picked_name text;
  finalized_count integer := 0;
begin
  for g in
    select id
    from public.giveaways
    where status = 'open'
      and signup_ends_at is not null
      and signup_ends_at <= now()
  loop
    if not exists (
      select 1
      from public.giveaway_winners w
      where w.giveaway_id = g.id
    ) then
      select x.name
      into picked_name
      from (
        select s.in_game_name as name
        from public.giveaway_signups s
        where s.giveaway_id = g.id
        union all
        select e.member_name as name
        from public.giveaway_entries e
        where e.giveaway_id = g.id
      ) as x
      order by random()
      limit 1;

      if picked_name is not null then
        insert into public.giveaway_winners (giveaway_id, winner_name)
        values (g.id, picked_name);
      end if;
    end if;

    update public.giveaways
    set status = 'closed'
    where id = g.id;

    finalized_count := finalized_count + 1;
  end loop;

  return finalized_count;
end;
$$;

grant execute on function public.auto_finalize_giveaways() to anon, authenticated;
