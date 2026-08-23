-- Keep XP mutations behind the authenticated server routes and service-role repository.
-- Existing rows and totals are preserved; only public mutation privileges change.

create or replace function public.record_xp_for_user(p_user_id uuid, p_amount integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_date date := (now() at time zone 'utc')::date;
  v_week_start date;
  v_week_end date;
  v_entry_id uuid;
begin
  if p_user_id is null then
    raise exception 'User ID is required to record XP.' using errcode = '22023';
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
    p_user_id,
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
  values (p_user_id, p_amount, now())
  on conflict (user_id) do update
    set total_xp = public.user_stats.total_xp + excluded.total_xp,
        last_activity_at = now();
end;
$$;

revoke all on function public.record_xp(integer) from public, anon, authenticated;
revoke all on function public.record_xp_for_user(uuid, integer) from public, anon, authenticated;
grant execute on function public.record_xp_for_user(uuid, integer) to service_role;

-- XP-bearing tables remain readable to signed-in users, but all writes go through
-- authenticated server routes using the service-role repository.
revoke all on table public.user_stats from anon, authenticated;
revoke all on table public.daily_progress from anon, authenticated;
revoke all on table public.user_word_progress from anon, authenticated;
revoke all on table public.mock_tests from anon, authenticated;
revoke all on table public.mock_test_answers from anon, authenticated;

grant select on table public.user_stats to authenticated;
grant select on table public.daily_progress to authenticated;
grant select on table public.user_word_progress to authenticated;
grant select on table public.mock_tests to authenticated;
grant select on table public.mock_test_answers to authenticated;

grant all on table public.user_stats to service_role;
grant all on table public.daily_progress to service_role;
grant all on table public.user_word_progress to service_role;
grant all on table public.mock_tests to service_role;
grant all on table public.mock_test_answers to service_role;

create unique index if not exists mock_test_answers_test_question_unique
  on public.mock_test_answers (test_id, question_id);
