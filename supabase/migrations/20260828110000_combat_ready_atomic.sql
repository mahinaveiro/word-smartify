-- Serialize readiness changes with match start and lobby departure.
-- Readiness is a lobby concern only; the service-role server boundary remains the sole caller.

create or replace function public.set_combat_ready(
  p_match_id uuid,
  p_user_id uuid,
  p_ready boolean
)
returns public.combat_matches
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_match public.combat_matches;
  v_player_count integer;
  v_ready_count integer;
  v_now timestamptz := clock_timestamp();
begin
  if p_match_id is null or p_user_id is null then
    raise exception 'Match and user are required.' using errcode = '22023';
  end if;

  select * into v_match
  from public.combat_matches
  where id = p_match_id
  for update;

  if not found or (v_match.host_id is distinct from p_user_id and v_match.opponent_id is distinct from p_user_id) then
    raise exception 'Match not found.' using errcode = 'P0002';
  end if;

  if v_match.status not in ('waiting', 'ready') or v_match.opponent_id is null then
    raise exception 'This match is not ready for play.' using errcode = '55000';
  end if;

  if v_match.wager_xp > 0 and v_match.wager_status <> 'reserved' then
    raise exception 'Both XP stakes must be reserved before readiness can be confirmed.' using errcode = '55000';
  end if;

  update public.combat_match_players
  set is_ready = coalesce(p_ready, false),
      last_seen_at = v_now
  where match_id = p_match_id
    and user_id = p_user_id;

  if not found then
    raise exception 'Match player not found.' using errcode = 'P0002';
  end if;

  select count(*), count(*) filter (where is_ready)
  into v_player_count, v_ready_count
  from public.combat_match_players
  where match_id = p_match_id;

  update public.combat_matches
  set status = case when v_player_count = 2 and v_ready_count = 2 then 'ready' else 'waiting' end,
      updated_at = v_now
  where id = p_match_id;

  select * into v_match
  from public.combat_matches
  where id = p_match_id;
  return v_match;
end;
$$;

revoke all on function public.set_combat_ready(uuid, uuid, boolean) from public, anon, authenticated;
grant execute on function public.set_combat_ready(uuid, uuid, boolean) to service_role;

comment on function public.set_combat_ready(uuid, uuid, boolean) is 'Atomically changes a participant readiness flag only while a two-player Combat lobby is waiting or ready.';
