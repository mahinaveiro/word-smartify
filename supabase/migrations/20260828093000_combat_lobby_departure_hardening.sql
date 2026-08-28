-- Harden the lobby departure RPC after the initial deployment: use NULL-safe
-- participant checks and reset the remaining host's readiness for a new opponent.

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

  if not found or (v_match.host_id is distinct from p_user_id and v_match.opponent_id is distinct from p_user_id) then
    raise exception 'Match not found.' using errcode = 'P0002';
  end if;

  if v_match.status in ('waiting', 'ready') and v_match.host_id is distinct from p_user_id then
    if v_match.opponent_id is distinct from p_user_id then
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
        responded_at = v_now
    where match_id = p_match_id
      and recipient_id = p_user_id
      and status in ('pending', 'accepted');

    update public.combat_match_players
    set is_ready = false
    where match_id = p_match_id;

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

revoke all on function public.leave_combat_match(uuid, uuid) from public, anon, authenticated;
grant execute on function public.leave_combat_match(uuid, uuid) to service_role;
