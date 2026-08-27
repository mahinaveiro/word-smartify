-- Allow a joined participant to leave before play starts without cancelling the host's room.
-- Wagered departures refund only the departing participant; later settlement ignores
-- refunded/orphaned reserve rows so those XP cannot be paid out a second time.

create or replace function public.settle_combat_wager(p_match_id uuid, p_winner_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_match public.combat_matches;
  v_reserve record;
  v_entries jsonb := '[]'::jsonb;
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
      'xp_delta', amount
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
    select reserve.user_id, reserve.amount
    from public.combat_wager_ledger as reserve
    where reserve.match_id = p_match_id
      and reserve.entry_type = 'reserve'
      and exists (
        select 1
        from public.combat_match_players as player
        where player.match_id = p_match_id and player.user_id = reserve.user_id
      )
      and not exists (
        select 1
        from public.combat_wager_ledger as prior_refund
        where prior_refund.match_id = p_match_id
          and prior_refund.user_id = reserve.user_id
          and prior_refund.entry_type = 'refund'
      )
    order by reserve.user_id
    for update
  loop
    if p_winner_id is null then
      v_entry_type := 'refund';
      v_amount := v_reserve.amount;
    elsif v_reserve.user_id = p_winner_id then
      v_entry_type := 'payout';
      v_amount := v_reserve.amount * 2;
    else
      v_entry_type := 'payout';
      v_amount := 0;
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

create or replace function public.leave_combat_match(
  p_match_id uuid,
  p_user_id uuid
)
returns public.combat_matches
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_match public.combat_matches;
  v_other public.combat_match_players;
  v_stake integer;
  v_now timestamptz := clock_timestamp();
  v_both_left boolean := false;
begin
  select * into v_match
  from public.combat_matches
  where id = p_match_id
  for update;

  if not found or (v_match.host_id <> p_user_id and v_match.opponent_id <> p_user_id) then
    raise exception 'Match not found.' using errcode = 'P0002';
  end if;

  if v_match.status in ('waiting', 'ready') and v_match.host_id <> p_user_id then
    if v_match.opponent_id <> p_user_id then
      raise exception 'You are not the joined player in this lobby.' using errcode = '42501';
    end if;

    if v_match.wager_xp > 0 then
      select amount into v_stake
      from public.combat_wager_ledger
      where match_id = p_match_id and user_id = p_user_id and entry_type = 'reserve'
      for update;

      if v_stake is null then
        raise exception 'The XP stake could not be verified. Please keep this room open and try again.' using errcode = '55000';
      end if;

      insert into public.combat_wager_ledger (match_id, user_id, entry_type, amount)
      values (p_match_id, p_user_id, 'refund', v_stake)
      on conflict do nothing;

      if found then
        update public.user_stats
        set total_xp = total_xp + v_stake,
            last_activity_at = now()
        where user_id = p_user_id;
      end if;
    end if;

    delete from public.combat_match_players
    where match_id = p_match_id and user_id = p_user_id;

    update public.combat_match_invites
    set status = 'expired',
        responded_at = coalesce(responded_at, v_now)
    where match_id = p_match_id
      and recipient_id = p_user_id
      and status in ('pending', 'accepted');

    update public.combat_matches
    set opponent_id = null,
        status = 'waiting',
        winner_id = null,
        started_at = null,
        finished_at = null,
        round_grace_deadline = null,
        wager_status = case when wager_xp > 0 then 'pending' else 'none' end,
        wager_winner_id = null,
        wager_settled_at = null,
        updated_at = v_now
    where id = p_match_id;

    select * into v_match from public.combat_matches where id = p_match_id;
    return v_match;
  end if;

  if v_match.status = 'active' then
    select * into v_other
    from public.combat_match_players
    where match_id = p_match_id and user_id <> p_user_id
    limit 1;

    update public.combat_match_players
    set last_seen_at = v_now - interval '16 seconds'
    where match_id = p_match_id and user_id = p_user_id;

    v_both_left := v_other.last_seen_at < v_now - interval '15 seconds';
    if v_both_left then
      update public.combat_matches
      set status = 'draw',
          winner_id = null,
          finished_at = v_now,
          round_grace_deadline = null,
          updated_at = v_now
      where id = p_match_id and status = 'active';
      perform public.settle_combat_wager(p_match_id, null);
    end if;
    select * into v_match from public.combat_matches where id = p_match_id;
  end if;

  return v_match;
end;
$$;

revoke all on function public.settle_combat_wager(uuid, uuid) from public, anon, authenticated;
revoke all on function public.leave_combat_match(uuid, uuid) from public, anon, authenticated;
grant execute on function public.settle_combat_wager(uuid, uuid) to service_role;
grant execute on function public.leave_combat_match(uuid, uuid) to service_role;
