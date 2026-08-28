-- Explicitly forfeit an active Combat match from the authenticated server boundary.
-- The temporary leave RPC remains responsible for the reconnect grace window.
create or replace function public.forfeit_combat_match(
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
  v_opponent_id uuid;
  v_now timestamptz := clock_timestamp();
begin
  select * into v_match
  from public.combat_matches
  where id = p_match_id
  for update;

  if not found or (v_match.host_id <> p_user_id and v_match.opponent_id <> p_user_id) then
    raise exception 'Match not found.' using errcode = 'P0002';
  end if;

  if v_match.status = 'active' then
    v_opponent_id := case when v_match.host_id = p_user_id then v_match.opponent_id else v_match.host_id end;
    if v_opponent_id is null then
      raise exception 'The opponent has not joined this match.' using errcode = '55000';
    end if;

    update public.combat_matches
    set status = 'abandoned',
        winner_id = v_opponent_id,
        finished_at = v_now,
        round_grace_deadline = null,
        updated_at = v_now
    where id = p_match_id and status = 'active';

    perform public.settle_combat_wager(p_match_id, v_opponent_id);
  end if;

  select * into v_match
  from public.combat_matches
  where id = p_match_id;
  return v_match;
end;
$$;

revoke all on function public.forfeit_combat_match(uuid, uuid) from public, anon, authenticated;
grant execute on function public.forfeit_combat_match(uuid, uuid) to service_role;
