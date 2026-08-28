-- Serialize friend-challenge responses with the target lobby.
-- The authenticated service-role API is the only caller.

create or replace function public.respond_combat_invite(
  p_invite_id uuid,
  p_user_id uuid,
  p_response text
)
returns public.combat_matches
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invite public.combat_match_invites;
  v_match public.combat_matches;
  v_now timestamptz := clock_timestamp();
begin
  if p_invite_id is null or p_user_id is null then
    raise exception 'Invite and user are required.' using errcode = '22023';
  end if;
  if p_response not in ('accepted', 'declined') then
    raise exception 'Invalid invitation response.' using errcode = '22023';
  end if;

  select * into v_invite
  from public.combat_match_invites
  where id = p_invite_id
  for update;

  if not found or v_invite.recipient_id is distinct from p_user_id or v_invite.status <> 'pending' then
    raise exception 'This challenge is no longer active.' using errcode = '55000';
  end if;

  select * into v_match
  from public.combat_matches
  where id = v_invite.match_id
  for update;

  if not found or v_match.status <> 'waiting' or v_match.opponent_id is not null then
    update public.combat_match_invites
    set status = 'expired', responded_at = v_now
    where id = p_invite_id and status = 'pending';
    raise exception 'This challenge is no longer active.' using errcode = '55000';
  end if;

  if v_match.expires_at <= v_now then
    update public.combat_match_invites
    set status = 'expired', responded_at = v_now
    where id = p_invite_id and status = 'pending';
    update public.combat_matches
    set status = 'expired', updated_at = v_now
    where id = v_match.id and status = 'waiting';
    if v_match.wager_xp > 0 and v_match.wager_status not in ('settled', 'refunded') then
      perform public.settle_combat_wager(v_match.id, null);
    end if;
    raise exception 'This challenge has expired.' using errcode = '55000';
  end if;

  if p_response = 'declined' then
    update public.combat_match_invites
    set status = 'declined', responded_at = v_now
    where id = p_invite_id and status = 'pending';

    update public.combat_matches
    set status = 'cancelled', cancelled_at = v_now, updated_at = v_now
    where id = v_match.id and status = 'waiting' and opponent_id is null;

    if v_match.wager_xp > 0 and v_match.wager_status not in ('settled', 'refunded') then
      perform public.settle_combat_wager(v_match.id, null);
    end if;
  else
    -- Reuse the authoritative join path while the match row is locked.
    select * into v_match
    from public.join_combat_match(v_match.id, p_user_id);

    update public.combat_match_invites
    set status = 'accepted', responded_at = v_now
    where id = p_invite_id and status = 'pending';
  end if;

  select * into v_match
  from public.combat_matches
  where id = v_invite.match_id;
  return v_match;
end;
$$;

revoke all on function public.respond_combat_invite(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.respond_combat_invite(uuid, uuid, text) to service_role;

comment on function public.respond_combat_invite(uuid, uuid, text) is 'Atomically accepts or declines a pending private Combat invitation with its waiting lobby and wager state.';
