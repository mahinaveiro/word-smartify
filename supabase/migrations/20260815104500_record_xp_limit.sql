-- Allow legitimate aggregate rewards such as a completed 100-question mock test
-- while retaining a bounded input for the authenticated atomic XP function.
create or replace function public.record_xp(p_amount integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_date date := (now() at time zone 'utc')::date;
  v_week_start date;
  v_week_end date;
  v_entry_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication is required to record XP.' using errcode = '42501';
  end if;

  if p_amount is null or p_amount <= 0 or p_amount > 1000 then
    raise exception 'XP amount must be between 1 and 1000.' using errcode = '22023';
  end if;

  v_week_start := v_date - ((extract(dow from v_date)::integer + 1) % 7);
  v_week_end := v_week_start + 6;

  insert into public.weekly_leaderboard_entries (
    user_id,
    week_start,
    week_end,
    xp,
    first_earned_at
  )
  values (
    v_user_id,
    v_week_start,
    v_week_end,
    p_amount,
    now()
  )
  on conflict (week_start, user_id) do update
    set xp = public.weekly_leaderboard_entries.xp + excluded.xp,
        updated_at = now()
    where public.weekly_leaderboard_entries.finalized_at is null
  returning id into v_entry_id;

  if v_entry_id is null then
    raise exception 'This weekly leaderboard period has already been finalized.' using errcode = '55000';
  end if;

  insert into public.user_stats (user_id, total_xp, last_activity_at)
  values (v_user_id, p_amount, now())
  on conflict (user_id) do update
    set total_xp = public.user_stats.total_xp + excluded.total_xp,
        last_activity_at = now();
end;
$$;

revoke all on function public.record_xp(integer) from public, anon;
grant execute on function public.record_xp(integer) to authenticated;
