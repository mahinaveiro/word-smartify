-- Word Smartify: bounded leaderboard and public aggregate read functions.
-- All functions return public-facing aggregates only; no answer rows or private
-- account details are exposed.

create or replace function public.get_leaderboard(
  p_mode text,
  p_limit integer default 20
)
returns table (
  rank integer,
  user_id uuid,
  display_name text,
  avatar_id text,
  avatar_url text,
  total_xp integer,
  weekly_xp integer,
  current_streak integer,
  longest_streak integer,
  words_learned integer,
  words_mastered integer,
  week_start date,
  week_end date
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_limit integer := least(greatest(coalesce(p_limit, 20), 1), 50);
  v_date date := (now() at time zone 'utc')::date;
  v_week_start date := v_date - ((extract(dow from v_date)::integer + 1) % 7);
  v_week_end date := v_week_start + 6;
begin
  if v_user_id is null then
    raise exception 'Authentication is required to view the leaderboard.' using errcode = '42501';
  end if;

  if p_mode not in ('all_time', 'weekly') then
    raise exception 'Leaderboard mode must be all_time or weekly.' using errcode = '22023';
  end if;

  if p_mode = 'weekly' then
    return query
      with scored as (
        select
          entries.user_id,
          profiles.display_name,
          profiles.avatar_id,
          profiles.avatar_url,
          stats.total_xp,
          entries.xp as weekly_xp,
          stats.current_streak,
          stats.longest_streak,
          stats.words_learned,
          stats.words_mastered,
          row_number() over (
            order by entries.xp desc, entries.first_earned_at asc, entries.user_id asc
          )::integer as position
        from public.weekly_leaderboard_entries entries
        join public.profiles profiles on profiles.id = entries.user_id
        join public.user_stats stats on stats.user_id = entries.user_id
        where entries.week_start = v_week_start
      )
      select
        scored.position,
        scored.user_id,
        scored.display_name,
        scored.avatar_id,
        scored.avatar_url,
        scored.total_xp,
        scored.weekly_xp,
        scored.current_streak,
        scored.longest_streak,
        scored.words_learned,
        scored.words_mastered,
        v_week_start,
        v_week_end
      from scored
      where scored.position <= v_limit or scored.user_id = v_user_id
      order by scored.position;
  else
    return query
      with scored as (
        select
          profiles.id as user_id,
          profiles.display_name,
          profiles.avatar_id,
          profiles.avatar_url,
          stats.total_xp,
          null::integer as weekly_xp,
          stats.current_streak,
          stats.longest_streak,
          stats.words_learned,
          stats.words_mastered,
          row_number() over (
            order by stats.total_xp desc, profiles.display_name asc, profiles.id asc
          )::integer as position
        from public.profiles profiles
        join public.user_stats stats on stats.user_id = profiles.id
      )
      select
        scored.position,
        scored.user_id,
        scored.display_name,
        scored.avatar_id,
        scored.avatar_url,
        scored.total_xp,
        scored.weekly_xp,
        scored.current_streak,
        scored.longest_streak,
        scored.words_learned,
        scored.words_mastered,
        v_week_start,
        v_week_end
      from scored
      where scored.position <= v_limit or scored.user_id = v_user_id
      order by scored.position;
  end if;
end;
$$;

revoke all on function public.get_leaderboard(text, integer) from public, anon;
grant execute on function public.get_leaderboard(text, integer) to authenticated;

create or replace function public.get_public_book_progress(p_user_id uuid)
returns table (
  book_id uuid,
  total integer,
  learned integer,
  mastered integer
)
language sql
security definer
set search_path = ''
as $$
  select
    books.id as book_id,
    count(words.id)::integer as total,
    count(words.id) filter (where progress.status is not null and progress.status <> 'new')::integer as learned,
    count(words.id) filter (where progress.status = 'mastered')::integer as mastered
  from public.books
  left join public.chapters on chapters.book_id = books.id
  left join public.levels on levels.chapter_id = chapters.id
  left join public.words on words.level_id = levels.id
  left join public.user_word_progress progress
    on progress.word_id = words.id
   and progress.user_id = p_user_id
  group by books.id, books.display_order
  order by books.display_order;
$$;

revoke all on function public.get_public_book_progress(uuid) from public, anon;
grant execute on function public.get_public_book_progress(uuid) to authenticated;

create or replace function public.get_public_leaderboard_summary(p_user_id uuid)
returns table (
  current_week_rank integer,
  highest_weekly_rank integer,
  weekly_wins integer,
  weekly_second_places integer,
  weekly_third_places integer,
  weeks_ranked integer,
  best_weekly_xp integer,
  all_time_rank integer
)
language sql
security definer
set search_path = ''
as $$
  with current_period as (
    select
      entries.user_id,
      row_number() over (
        order by entries.xp desc, entries.first_earned_at asc, entries.user_id asc
      )::integer as position
    from public.weekly_leaderboard_entries entries
    where entries.week_start = (
      (now() at time zone 'utc')::date
      - ((extract(dow from (now() at time zone 'utc')::date)::integer + 1) % 7)
    )
  ),
  weekly_history as (
    select
      min(finalized_rank)::integer as highest_weekly_rank,
      count(*) filter (where finalized_rank = 1)::integer as weekly_wins,
      count(*) filter (where finalized_rank = 2)::integer as weekly_second_places,
      count(*) filter (where finalized_rank = 3)::integer as weekly_third_places,
      count(*)::integer as weeks_ranked,
      max(xp)::integer as best_weekly_xp
    from public.weekly_leaderboard_entries
    where user_id = p_user_id
  ),
  all_time as (
    select
      row_number() over (
        order by stats.total_xp desc, profiles.display_name asc, profiles.id asc
      )::integer as position,
      profiles.id as user_id
    from public.profiles profiles
    join public.user_stats stats on stats.user_id = profiles.id
  )
  select
    current_period.position as current_week_rank,
    weekly_history.highest_weekly_rank,
    coalesce(weekly_history.weekly_wins, 0),
    coalesce(weekly_history.weekly_second_places, 0),
    coalesce(weekly_history.weekly_third_places, 0),
    coalesce(weekly_history.weeks_ranked, 0),
    coalesce(weekly_history.best_weekly_xp, 0),
    all_time.position as all_time_rank
  from weekly_history
  left join current_period on current_period.user_id = p_user_id
  left join all_time on all_time.user_id = p_user_id;
$$;

revoke all on function public.get_public_leaderboard_summary(uuid) from public, anon;
grant execute on function public.get_public_leaderboard_summary(uuid) to authenticated;

create or replace function public.get_public_mock_test_summary(p_user_id uuid)
returns table (
  tests_taken integer,
  average_score numeric,
  highest_score numeric,
  average_percentage numeric,
  best_percentage numeric
)
language sql
security definer
set search_path = ''
as $$
  select
    count(*)::integer as tests_taken,
    round(avg((correct_answers::numeric / nullif(total_questions, 0)) * 10), 1) as average_score,
    round(max((correct_answers::numeric / nullif(total_questions, 0)) * 10), 1) as highest_score,
    round(avg(score)::numeric, 1) as average_percentage,
    round(max(score)::numeric, 1) as best_percentage
  from public.mock_tests
  where user_id = p_user_id
    and time_taken_seconds is not null;
$$;

revoke all on function public.get_public_mock_test_summary(uuid) from public, anon;
grant execute on function public.get_public_mock_test_summary(uuid) to authenticated;
