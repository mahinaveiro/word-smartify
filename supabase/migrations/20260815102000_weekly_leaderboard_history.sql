-- Word Smartify: persisted weekly leaderboard history and external avatar URLs
--
-- Week boundaries are UTC calendar dates: Saturday through Friday.
-- The existing app's todayISO() also uses UTC dates, so client and database
-- agree on one stable period boundary.

alter table public.profiles
  add column if not exists avatar_url text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_avatar_url_length_check'
  ) then
    alter table public.profiles
      add constraint profiles_avatar_url_length_check
      check (avatar_url is null or char_length(avatar_url) <= 2048);
  end if;
end;
$$;

create table if not exists public.weekly_leaderboard_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  week_end date not null,
  xp integer not null default 0,
  first_earned_at timestamptz not null default now(),
  finalized_rank integer,
  finalized_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint weekly_leaderboard_entries_week_user_key unique (week_start, user_id),
  constraint weekly_leaderboard_entries_week_bounds_check check (week_end = week_start + 6),
  constraint weekly_leaderboard_entries_xp_check check (xp >= 0),
  constraint weekly_leaderboard_entries_rank_check check (finalized_rank is null or finalized_rank > 0),
  constraint weekly_leaderboard_entries_finalization_check check (
    (finalized_rank is null and finalized_at is null)
    or (finalized_rank is not null and finalized_at is not null)
  )
);

create index if not exists weekly_leaderboard_entries_period_score_idx
  on public.weekly_leaderboard_entries (week_start, xp desc, first_earned_at asc, user_id asc);

create index if not exists weekly_leaderboard_entries_period_rank_idx
  on public.weekly_leaderboard_entries (week_start, finalized_rank)
  where finalized_rank is not null;

create index if not exists weekly_leaderboard_entries_user_history_idx
  on public.weekly_leaderboard_entries (user_id, finalized_rank, week_start desc);

alter table public.weekly_leaderboard_entries enable row level security;

revoke all on table public.weekly_leaderboard_entries from anon, authenticated;
grant select on table public.weekly_leaderboard_entries to authenticated;

drop policy if exists weekly_leaderboard_entries_authenticated_read on public.weekly_leaderboard_entries;
create policy weekly_leaderboard_entries_authenticated_read
  on public.weekly_leaderboard_entries
  for select
  to authenticated
  using (true);

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

  if p_amount is null or p_amount <= 0 or p_amount > 100 then
    raise exception 'XP amount must be between 1 and 100.' using errcode = '22023';
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

create or replace function public.finalize_weekly_leaderboard(p_week_start date)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current_date date := (now() at time zone 'utc')::date;
  v_current_week_start date;
  v_updated integer := 0;
begin
  if p_week_start is null then
    raise exception 'A week start date is required.' using errcode = '22023';
  end if;

  if p_week_start <> p_week_start - ((extract(dow from p_week_start)::integer + 1) % 7) then
    raise exception 'Weekly leaderboard periods must start on Saturday.' using errcode = '22023';
  end if;

  v_current_week_start := v_current_date - ((extract(dow from v_current_date)::integer + 1) % 7);
  if p_week_start >= v_current_week_start then
    raise exception 'The current weekly leaderboard period cannot be finalized.' using errcode = '22023';
  end if;

  with ranked as (
    select
      id,
      row_number() over (
        order by xp desc, first_earned_at asc, user_id asc
      )::integer as rank_value
    from public.weekly_leaderboard_entries
    where week_start = p_week_start
      and finalized_at is null
  )
  update public.weekly_leaderboard_entries entries
  set finalized_rank = ranked.rank_value,
      finalized_at = now(),
      updated_at = now()
  from ranked
  where entries.id = ranked.id;

  get diagnostics v_updated = row_count;
  return v_updated;
end;
$$;

revoke all on function public.finalize_weekly_leaderboard(date) from public, anon;
grant execute on function public.finalize_weekly_leaderboard(date) to authenticated;

-- pg_cron is available in the project but may not yet be installed. The job is
-- idempotently replaced so this migration can be safely re-applied.
create extension if not exists pg_cron;

do $$
declare
  v_job_id bigint;
begin
  select jobid
    into v_job_id
  from cron.job
  where jobname = 'word-smartify-weekly-leaderboard-finalization'
  limit 1;

  if v_job_id is not null then
    perform cron.unschedule(v_job_id);
  end if;

  perform cron.schedule(
    'word-smartify-weekly-leaderboard-finalization',
    '5 0 * * 6',
    $cron$
      select public.finalize_weekly_leaderboard(
        ((now() at time zone 'utc')::date
          - ((extract(dow from (now() at time zone 'utc')::date)::integer + 1) % 7)
          - 7)
      );
    $cron$
  );
end;
$$;
