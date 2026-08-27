-- Combat XP wagers are virtual in-app points only. They are optional, friend/private-match
-- compatible, and never change learning progress or award study XP.

alter table public.combat_matches
  add column if not exists wager_xp integer not null default 0,
  add column if not exists wager_status text not null default 'none',
  add column if not exists wager_winner_id uuid references auth.users(id) on delete set null,
  add column if not exists wager_settled_at timestamptz;

alter table public.combat_matches
  drop constraint if exists combat_matches_wager_xp_check;
alter table public.combat_matches
  add constraint combat_matches_wager_xp_check check (wager_xp in (0, 100));

alter table public.combat_matches
  drop constraint if exists combat_matches_wager_status_check;
alter table public.combat_matches
  add constraint combat_matches_wager_status_check check (wager_status in ('none', 'pending', 'reserved', 'settled', 'refunded'));

create table if not exists public.combat_wager_ledger (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.combat_matches(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_type text not null check (entry_type in ('reserve', 'refund', 'payout')),
  amount integer not null check (amount > 0),
  created_at timestamptz not null default now()
);

create unique index if not exists combat_wager_reserve_unique
  on public.combat_wager_ledger (match_id, user_id)
  where entry_type = 'reserve';

create unique index if not exists combat_wager_refund_unique
  on public.combat_wager_ledger (match_id, user_id)
  where entry_type = 'refund';

create unique index if not exists combat_wager_payout_unique
  on public.combat_wager_ledger (match_id, user_id)
  where entry_type = 'payout';

create index if not exists combat_wager_ledger_match_idx
  on public.combat_wager_ledger (match_id, created_at);

alter table public.combat_wager_ledger enable row level security;
revoke all on table public.combat_wager_ledger from anon, authenticated;
grant all on table public.combat_wager_ledger to service_role;

create or replace function public.reserve_combat_wager(p_match_id uuid, p_user_id uuid)
returns public.combat_matches
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_match public.combat_matches;
  v_balance integer;
  v_reserves integer;
begin
  if p_match_id is null or p_user_id is null then
    raise exception 'Match and user are required.' using errcode = '22023';
  end if;

  select * into v_match
  from public.combat_matches
  where id = p_match_id
  for update;

  if not found then
    raise exception 'Match not found.' using errcode = 'P0002';
  end if;

  if v_match.wager_xp = 0 then
    return v_match;
  end if;

  if v_match.status <> 'waiting' then
    raise exception 'This wager is no longer available.' using errcode = '55000';
  end if;

  if p_user_id <> v_match.host_id and (v_match.opponent_id is not null and v_match.opponent_id <> p_user_id) then
    raise exception 'You cannot reserve this wager.' using errcode = '42501';
  end if;

  if exists (
    select 1 from public.combat_wager_ledger
    where match_id = p_match_id and user_id = p_user_id and entry_type = 'reserve'
  ) then
    return v_match;
  end if;

  select total_xp into v_balance
  from public.user_stats
  where user_id = p_user_id
  for update;

  if coalesce(v_balance, 0) < v_match.wager_xp then
    raise exception 'You need at least % XP to enter this wager.', v_match.wager_xp using errcode = '22023';
  end if;

  insert into public.combat_wager_ledger (match_id, user_id, entry_type, amount)
  values (p_match_id, p_user_id, 'reserve', v_match.wager_xp);

  update public.user_stats
  set total_xp = total_xp - v_match.wager_xp,
      last_activity_at = now()
  where user_id = p_user_id;

  select count(*) into v_reserves
  from public.combat_wager_ledger
  where match_id = p_match_id and entry_type = 'reserve';

  update public.combat_matches
  set wager_status = case when v_reserves = 2 then 'reserved' else 'pending' end,
      updated_at = now()
  where id = p_match_id;

  select * into v_match from public.combat_matches where id = p_match_id;
  return v_match;
end;
$$;

create or replace function public.join_combat_match(p_match_id uuid, p_user_id uuid)
returns public.combat_matches
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_match public.combat_matches;
  v_balance integer;
begin
  if p_match_id is null or p_user_id is null then
    raise exception 'Match and user are required.' using errcode = '22023';
  end if;

  select * into v_match
  from public.combat_matches
  where id = p_match_id
  for update;

  if not found then
    raise exception 'Match not found.' using errcode = 'P0002';
  end if;

  if v_match.host_id = p_user_id then
    return v_match;
  end if;

  if v_match.status <> 'waiting' or v_match.opponent_id is not null or v_match.expires_at <= now() then
    raise exception 'That match is no longer accepting a player.' using errcode = '55000';
  end if;

  if v_match.wager_xp > 0 then
    select total_xp into v_balance
    from public.user_stats
    where user_id = p_user_id
    for update;

    if coalesce(v_balance, 0) < v_match.wager_xp then
      raise exception 'You need at least % XP to enter this wager.', v_match.wager_xp using errcode = '22023';
    end if;

    insert into public.combat_wager_ledger (match_id, user_id, entry_type, amount)
    values (p_match_id, p_user_id, 'reserve', v_match.wager_xp);

    update public.user_stats
    set total_xp = total_xp - v_match.wager_xp,
        last_activity_at = now()
    where user_id = p_user_id;
  end if;

  insert into public.combat_match_players (match_id, user_id, slot)
  values (p_match_id, p_user_id, 2);

  update public.combat_matches
  set opponent_id = p_user_id,
      status = 'ready',
      wager_status = case when wager_xp > 0 then 'reserved' else 'none' end,
      updated_at = now()
  where id = p_match_id;

  select * into v_match from public.combat_matches where id = p_match_id;
  return v_match;
exception
  when unique_violation then
    raise exception 'This match was just claimed by another player.' using errcode = '23505';
end;
$$;

create or replace function public.settle_combat_wager(p_match_id uuid, p_winner_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_match public.combat_matches;
  v_reserve record;
  v_existing jsonb;
  v_entries jsonb := '[]'::jsonb;
  v_delta integer;
  v_entry_type text;
  v_amount integer;
begin
  if p_match_id is null then
    raise exception 'Match is required.' using errcode = '22023';
  end if;

  select * into v_match
  from public.combat_matches
  where id = p_match_id
  for update;

  if not found then
    raise exception 'Match not found.' using errcode = 'P0002';
  end if;

  if v_match.wager_xp = 0 then
    return jsonb_build_object('status', 'none', 'stake_xp', 0, 'entries', '[]'::jsonb);
  end if;

  if v_match.wager_status in ('settled', 'refunded') then
    select coalesce(jsonb_agg(jsonb_build_object(
      'user_id', user_id,
      'entry_type', entry_type,
      'amount', amount,
      'xp_delta', case when entry_type = 'payout' then amount else amount end
    ) order by user_id, entry_type), '[]'::jsonb)
    into v_entries
    from public.combat_wager_ledger
    where match_id = p_match_id and entry_type in ('refund', 'payout');
    return jsonb_build_object('status', v_match.wager_status, 'stake_xp', v_match.wager_xp, 'entries', v_entries);
  end if;

  if p_winner_id is not null and p_winner_id <> v_match.host_id and p_winner_id <> v_match.opponent_id then
    raise exception 'The wager winner is not in this match.' using errcode = '22023';
  end if;

  for v_reserve in
    select user_id, amount
    from public.combat_wager_ledger
    where match_id = p_match_id and entry_type = 'reserve'
    order by user_id
    for update
  loop
    if p_winner_id is null then
      v_entry_type := 'refund';
      v_amount := v_reserve.amount;
      v_delta := v_amount;
    elsif v_reserve.user_id = p_winner_id then
      v_entry_type := 'payout';
      v_amount := v_reserve.amount * 2;
      v_delta := v_amount;
    else
      v_entry_type := 'payout';
      v_amount := 0;
      v_delta := 0;
    end if;

    if v_amount > 0 then
      insert into public.combat_wager_ledger (match_id, user_id, entry_type, amount)
      values (p_match_id, v_reserve.user_id, v_entry_type, v_amount)
      on conflict do nothing;

      if found then
        update public.user_stats
        set total_xp = total_xp + v_amount,
            last_activity_at = now()
        where user_id = v_reserve.user_id;
      end if;
    end if;

    v_entries := v_entries || jsonb_build_array(jsonb_build_object(
      'user_id', v_reserve.user_id,
      'entry_type', v_entry_type,
      'amount', v_amount,
      'xp_delta', case when p_winner_id is null then v_reserve.amount else v_amount - v_reserve.amount end
    ));
  end loop;

  update public.combat_matches
  set wager_status = case when p_winner_id is null then 'refunded' else 'settled' end,
      wager_winner_id = p_winner_id,
      wager_settled_at = now(),
      updated_at = now()
  where id = p_match_id;

  return jsonb_build_object(
    'status', case when p_winner_id is null then 'refunded' else 'settled' end,
    'stake_xp', v_match.wager_xp,
    'entries', v_entries
  );
end;
$$;

revoke all on function public.reserve_combat_wager(uuid, uuid) from public, anon, authenticated;
revoke all on function public.join_combat_match(uuid, uuid) from public, anon, authenticated;
revoke all on function public.settle_combat_wager(uuid, uuid) from public, anon, authenticated;
grant execute on function public.reserve_combat_wager(uuid, uuid) to service_role;
grant execute on function public.join_combat_match(uuid, uuid) to service_role;
grant execute on function public.settle_combat_wager(uuid, uuid) to service_role;

alter publication supabase_realtime add table public.combat_wager_ledger;
