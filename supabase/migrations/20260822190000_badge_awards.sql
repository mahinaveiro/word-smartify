-- Word Smartify badge awards
-- Permanent contributor awards are seeded once. Weekly champion awards are
-- inserted by the existing weekly finalization function, so the app never
-- needs a manually edited list of winners.

create table if not exists public.badge_awards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_key text not null,
  award_kind text not null,
  week_start date,
  week_end date,
  placement integer,
  awarded_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  constraint badge_awards_kind_check check (award_kind in ('permanent', 'weekly_champion')),
  constraint badge_awards_key_check check (badge_key in (
    'contributor-tasnim',
    'contributor-ashik',
    'weekly-1st',
    'weekly-2nd',
    'weekly-3rd'
  )),
  constraint badge_awards_period_check check (
    (award_kind = 'permanent' and week_start is null and week_end is null and placement is null)
    or
    (award_kind = 'weekly_champion'
      and week_start is not null
      and week_end = week_start + 6
      and placement in (1, 2, 3))
  ),
  constraint badge_awards_kind_key_check check (
    (award_kind = 'permanent' and badge_key in ('contributor-tasnim', 'contributor-ashik'))
    or (award_kind = 'weekly_champion' and (
      (badge_key = 'weekly-1st' and placement = 1)
      or (badge_key = 'weekly-2nd' and placement = 2)
      or (badge_key = 'weekly-3rd' and placement = 3)
    ))
  )
);

create unique index if not exists badge_awards_permanent_user_key
  on public.badge_awards (user_id, badge_key)
  where award_kind = 'permanent';

create unique index if not exists badge_awards_weekly_user_key
  on public.badge_awards (user_id, badge_key, week_start)
  where award_kind = 'weekly_champion';

create index if not exists badge_awards_active_lookup_idx
  on public.badge_awards (user_id, award_kind, week_start desc, placement);

create index if not exists badge_awards_pending_ack_idx
  on public.badge_awards (user_id, awarded_at asc)
  where acknowledged_at is null;

alter table public.badge_awards enable row level security;

revoke all on table public.badge_awards from anon, authenticated;
grant select on table public.badge_awards to authenticated;
grant update (acknowledged_at) on table public.badge_awards to authenticated;

drop policy if exists badge_awards_authenticated_read on public.badge_awards;
create policy badge_awards_authenticated_read
  on public.badge_awards
  for select
  to authenticated
  using (true);

drop policy if exists badge_awards_owner_acknowledge on public.badge_awards;
create policy badge_awards_owner_acknowledge
  on public.badge_awards
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create or replace function public.get_display_badges_for_users(p_user_ids uuid[])
returns table (
  id uuid,
  user_id uuid,
  badge_key text,
  award_kind text,
  week_start date,
  week_end date,
  placement integer,
  awarded_at timestamptz,
  acknowledged_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  with latest_finalized_week as (
    select max(week_start) as week_start
    from public.weekly_leaderboard_entries
    where finalized_at is not null
  )
  select
    awards.id,
    awards.user_id,
    awards.badge_key,
    awards.award_kind,
    awards.week_start,
    awards.week_end,
    awards.placement,
    awards.awarded_at,
    awards.acknowledged_at
  from public.badge_awards awards
  where awards.user_id = any(coalesce(p_user_ids, '{}'::uuid[]))
    and (
      awards.award_kind = 'permanent'
      or awards.week_start = (select week_start from latest_finalized_week)
    )
  order by awards.user_id, awards.award_kind, awards.placement nulls first, awards.awarded_at;
$$;

revoke all on function public.get_display_badges_for_users(uuid[]) from public, anon;
grant execute on function public.get_display_badges_for_users(uuid[]) to authenticated;

create or replace function public.get_my_pending_badge_awards()
returns table (
  id uuid,
  user_id uuid,
  badge_key text,
  award_kind text,
  week_start date,
  week_end date,
  placement integer,
  awarded_at timestamptz,
  acknowledged_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    awards.id,
    awards.user_id,
    awards.badge_key,
    awards.award_kind,
    awards.week_start,
    awards.week_end,
    awards.placement,
    awards.awarded_at,
    awards.acknowledged_at
  from public.badge_awards awards
  where awards.user_id = (select auth.uid())
    and awards.acknowledged_at is null
  order by awards.awarded_at asc, awards.id asc
  limit 12;
$$;

revoke all on function public.get_my_pending_badge_awards() from public, anon;
grant execute on function public.get_my_pending_badge_awards() to authenticated;

create or replace function public.acknowledge_my_badge_awards(p_award_ids uuid[])
returns integer
language sql
volatile
security invoker
set search_path = ''
as $$
  with acknowledged as (
    update public.badge_awards
    set acknowledged_at = now()
    where id = any(coalesce(p_award_ids, '{}'::uuid[]))
      and user_id = (select auth.uid())
      and acknowledged_at is null
    returning id
  )
  select count(*)::integer from acknowledged;
$$;

revoke all on function public.acknowledge_my_badge_awards(uuid[]) from public, anon;
grant execute on function public.acknowledge_my_badge_awards(uuid[]) to authenticated;

-- Initial permanent recognition. These rows intentionally start unacknowledged
-- so the recipients see the reward experience once on their next app opening.
insert into public.badge_awards (user_id, badge_key, award_kind)
values
  ('3959d861-7a05-44ed-acae-84320f5ad68f', 'contributor-tasnim', 'permanent'),
  ('bf9c2e49-897d-4477-b9b2-c4603c11e6cc', 'contributor-ashik', 'permanent')
on conflict do nothing;

-- Backfill only the most recently finalized week. Older historical winners are
-- still visible through leaderboard history, but should not receive a surprise
-- congratulations for awards that predate this feature.
insert into public.badge_awards (
  user_id,
  badge_key,
  award_kind,
  week_start,
  week_end,
  placement,
  awarded_at
)
select
  entries.user_id,
  case entries.finalized_rank
    when 1 then 'weekly-1st'
    when 2 then 'weekly-2nd'
    when 3 then 'weekly-3rd'
  end,
  'weekly_champion',
  entries.week_start,
  entries.week_end,
  entries.finalized_rank,
  coalesce(entries.finalized_at, now())
from public.weekly_leaderboard_entries entries
where entries.week_start = (
    select max(latest.week_start)
    from public.weekly_leaderboard_entries latest
    where latest.finalized_at is not null
  )
  and entries.finalized_rank in (1, 2, 3)
  and entries.finalized_at is not null
on conflict do nothing;

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

  insert into public.badge_awards (
    user_id,
    badge_key,
    award_kind,
    week_start,
    week_end,
    placement,
    awarded_at
  )
  select
    entries.user_id,
    case entries.finalized_rank
      when 1 then 'weekly-1st'
      when 2 then 'weekly-2nd'
      when 3 then 'weekly-3rd'
    end,
    'weekly_champion',
    entries.week_start,
    entries.week_end,
    entries.finalized_rank,
    coalesce(entries.finalized_at, now())
  from public.weekly_leaderboard_entries entries
  where entries.week_start = p_week_start
    and entries.finalized_rank in (1, 2, 3)
    and entries.finalized_at is not null
  on conflict do nothing;

  return v_updated;
end;
$$;

revoke all on function public.finalize_weekly_leaderboard(date) from public, anon, authenticated;
