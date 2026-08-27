-- Make host cancellation atomic with invite cleanup and wager settlement.
-- The service-role server boundary is the only caller.

create or replace function public.cancel_combat_match(
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
  v_now timestamptz := clock_timestamp();
begin
  if p_match_id is null or p_user_id is null then
    raise exception 'Match and user are required.' using errcode = '22023';
  end if;

  select * into v_match
  from public.combat_matches
  where id = p_match_id
  for update;

  if not found or v_match.host_id is distinct from p_user_id then
    raise exception 'Only the match host can cancel this lobby.' using errcode = '42501';
  end if;
  if v_match.status not in ('waiting', 'ready') then
    raise exception 'This match can no longer be cancelled.' using errcode = '55000';
  end if;

  update public.combat_match_invites
  set status = 'expired',
      responded_at = v_now
  where match_id = p_match_id
    and status in ('pending', 'accepted');

  update public.combat_matches
  set status = 'cancelled',
      cancelled_at = v_now,
      updated_at = v_now
  where id = p_match_id;

  if v_match.wager_xp > 0 and v_match.wager_status not in ('settled', 'refunded') then
    perform public.settle_combat_wager(p_match_id, null);
  end if;

  select * into v_match
  from public.combat_matches
  where id = p_match_id;
  return v_match;
end;
$$;

revoke all on function public.cancel_combat_match(uuid, uuid) from public, anon, authenticated;
grant execute on function public.cancel_combat_match(uuid, uuid) to service_role;

comment on function public.cancel_combat_match(uuid, uuid) is 'Atomically cancels a waiting Combat lobby, closes open invitations, and refunds any unresolved wager reserves.';
