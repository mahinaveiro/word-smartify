-- Combat lifecycle hardening is intentionally additive and unapplied by this branch.
-- The API authenticates the caller first and invokes these RPCs through service_role.
-- No answer key is returned by these functions.

alter table public.combat_matches
  add column if not exists round_grace_deadline timestamptz,
  add column if not exists winner_id uuid references auth.users(id) on delete set null;

create index if not exists combat_matches_active_heartbeat_idx
  on public.combat_matches (status, updated_at)
  where status = 'active';

create table if not exists public.combat_match_messages (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.combat_matches(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  message text not null check (message in ('Good luck!', 'Nice one!', 'I’m ready!', 'That was close!')),
  created_at timestamptz not null default now()
);

create index if not exists combat_match_messages_match_created_idx
  on public.combat_match_messages (match_id, created_at desc);

alter table public.combat_match_messages enable row level security;

create policy combat_match_messages_select_participant on public.combat_match_messages
  for select to authenticated
  using (exists (
    select 1
    from public.combat_matches m
    where m.id = match_id
      and (m.host_id = auth.uid() or m.opponent_id = auth.uid())
  ));

create policy combat_match_messages_insert_participant on public.combat_match_messages
  for insert to authenticated
  with check (
    auth.uid() = sender_id
    and message in ('Good luck!', 'Nice one!', 'I’m ready!', 'That was close!')
    and exists (
      select 1
      from public.combat_matches m
      where m.id = match_id
        and m.status in ('waiting', 'ready', 'active')
        and (m.host_id = auth.uid() or m.opponent_id = auth.uid())
    )
  );

revoke all on table public.combat_match_messages from anon, authenticated;
grant select, insert on table public.combat_match_messages to authenticated;
grant all on table public.combat_match_messages to service_role;

create or replace function public.submit_combat_answer(
  p_match_id uuid,
  p_user_id uuid,
  p_question_id uuid,
  p_selected_answer text,
  p_response_time_ms integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_match public.combat_matches;
  v_question public.combat_match_questions;
  v_now timestamptz := clock_timestamp();
  v_round_started_at timestamptz;
  v_round_deadline timestamptz;
  v_time_limit_ms integer;
  v_elapsed_ms integer;
  v_timed_out boolean;
  v_existing boolean;
  v_selected text;
  v_is_correct boolean;
  v_answer_count integer;
  v_next_position integer;
  v_final boolean := false;
  v_has_option boolean := false;
  v_player_id uuid;
  v_first_user_id uuid;
  v_second_user_id uuid;
  v_first_correct integer := 0;
  v_second_correct integer := 0;
  v_first_time bigint := 0;
  v_second_time bigint := 0;
  v_winner_id uuid;
  v_final_status text;
begin
  if p_match_id is null or p_user_id is null or p_question_id is null then
    raise exception 'Match, player, and question are required.' using errcode = '22023';
  end if;

  select * into v_match
  from public.combat_matches
  where id = p_match_id
  for update;

  if not found or (v_match.host_id <> p_user_id and v_match.opponent_id <> p_user_id) then
    raise exception 'Match not found.' using errcode = 'P0002';
  end if;
  if v_match.status <> 'active' or v_match.started_at is null then
    raise exception 'This match is not accepting answers.' using errcode = '55000';
  end if;

  select * into v_question
  from public.combat_match_questions
  where match_id = p_match_id
    and position = v_match.current_question_index;

  if not found or v_question.question_id <> p_question_id then
    raise exception 'That question is no longer active.' using errcode = '55000';
  end if;

  v_round_started_at := coalesce(v_match.current_question_started_at, v_match.started_at);
  v_time_limit_ms := v_match.time_limit_seconds * 1000;
  v_elapsed_ms := greatest(0, least(v_time_limit_ms, floor(extract(epoch from (v_now - v_round_started_at)) * 1000)::integer));
  v_timed_out := v_now > (v_round_started_at + make_interval(secs => v_match.time_limit_seconds));

  select exists (
    select 1
    from public.combat_match_answers
    where match_id = p_match_id
      and user_id = p_user_id
      and question_id = p_question_id
  ) into v_existing;

  if not v_existing then
    if v_match.round_grace_deadline is not null and v_now >= v_match.round_grace_deadline then
      v_selected := null;
      v_is_correct := false;
      v_elapsed_ms := v_time_limit_ms;
    elsif v_timed_out then
      v_selected := null;
      v_is_correct := false;
      v_elapsed_ms := v_time_limit_ms;
    else
      if p_selected_answer is not null and jsonb_typeof(v_question.options) = 'array' then
        select exists (
          select 1
          from jsonb_array_elements_text(v_question.options) as option_value(value)
          where option_value.value = p_selected_answer
        ) into v_has_option;
      end if;
      v_selected := case when v_has_option then p_selected_answer else null end;
      v_is_correct := v_selected is not null and v_selected = v_question.correct_answer;
      v_elapsed_ms := greatest(0, least(v_time_limit_ms, v_elapsed_ms));
    end if;

    insert into public.combat_match_answers (match_id, user_id, question_id, selected_answer, is_correct, response_time_ms, submitted_at)
    values (p_match_id, p_user_id, p_question_id, v_selected, v_is_correct, v_elapsed_ms, v_now)
    on conflict (match_id, user_id, question_id) do nothing;

    update public.combat_match_players
    set last_seen_at = v_now
    where match_id = p_match_id and user_id = p_user_id;
  end if;

  select count(*) into v_answer_count
  from public.combat_match_answers
  where match_id = p_match_id and question_id = p_question_id;

  if v_answer_count = 1 and v_match.round_grace_deadline is null then
    v_round_deadline := v_now + interval '10 seconds';
    update public.combat_matches
    set round_grace_deadline = v_round_deadline,
        updated_at = v_now
    where id = p_match_id and status = 'active' and current_question_index = v_match.current_question_index;
    v_match.round_grace_deadline := v_round_deadline;
  else
    v_round_deadline := v_match.round_grace_deadline;
  end if;

  if v_answer_count < 2 and v_round_deadline is not null and v_now >= v_round_deadline then
    insert into public.combat_match_answers (match_id, user_id, question_id, selected_answer, is_correct, response_time_ms, submitted_at)
    select p_match_id, player.user_id, p_question_id, null, false, v_time_limit_ms, v_now
    from public.combat_match_players player
    where player.match_id = p_match_id
      and not exists (
        select 1 from public.combat_match_answers answer
        where answer.match_id = p_match_id
          and answer.user_id = player.user_id
          and answer.question_id = p_question_id
      )
    on conflict (match_id, user_id, question_id) do nothing;

    select count(*) into v_answer_count
    from public.combat_match_answers
    where match_id = p_match_id and question_id = p_question_id;
  end if;

  if v_answer_count = 2 then
    v_next_position := v_match.current_question_index + 1;
    v_final := v_next_position >= v_match.question_count;
    if v_final then
      select user_id into v_first_user_id from public.combat_match_players where match_id = p_match_id and slot = 1;
      select user_id into v_second_user_id from public.combat_match_players where match_id = p_match_id and slot = 2;
      select
        coalesce(sum(case when is_correct then 1 else 0 end), 0),
        coalesce(sum(response_time_ms), 0)
      into v_first_correct, v_first_time
      from public.combat_match_answers
      where match_id = p_match_id and user_id = v_first_user_id;
      select
        coalesce(sum(case when is_correct then 1 else 0 end), 0),
        coalesce(sum(response_time_ms), 0)
      into v_second_correct, v_second_time
      from public.combat_match_answers
      where match_id = p_match_id and user_id = v_second_user_id;
      v_winner_id := case
        when v_first_correct = v_second_correct and v_first_time = v_second_time then null
        when v_first_correct > v_second_correct or (v_first_correct = v_second_correct and v_first_time < v_second_time) then v_first_user_id
        else v_second_user_id
      end;
      v_final_status := case when v_winner_id is null then 'draw' else 'completed' end;
      update public.combat_matches
      set status = v_final_status,
          winner_id = v_winner_id,
          finished_at = v_now,
          round_grace_deadline = null,
          updated_at = v_now
      where id = p_match_id and status = 'active' and current_question_index = v_match.current_question_index;
      perform public.settle_combat_wager(p_match_id, v_winner_id);
    else
      update public.combat_matches
      set current_question_index = v_next_position,
          current_question_started_at = v_now,
          round_grace_deadline = null,
          updated_at = v_now
      where id = p_match_id and status = 'active' and current_question_index = v_match.current_question_index;
    end if;
  else
    v_next_position := v_match.current_question_index;
  end if;

  select * into v_match from public.combat_matches where id = p_match_id;
  return jsonb_build_object(
    'next_position', v_next_position,
    'is_final', v_final,
    'match', to_jsonb(v_match)
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

create or replace function public.heartbeat_combat_match(
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
  v_me public.combat_match_players;
  v_other public.combat_match_players;
  v_now timestamptz := clock_timestamp();
  v_me_stale boolean;
  v_other_stale boolean;
  v_next_status text;
  v_winner_id uuid;
begin
  select * into v_match
  from public.combat_matches
  where id = p_match_id
  for update;

  if not found or (v_match.host_id <> p_user_id and v_match.opponent_id <> p_user_id) then
    raise exception 'Match not found.' using errcode = 'P0002';
  end if;
  if v_match.status <> 'active' then
    return v_match;
  end if;

  update public.combat_match_players
  set last_seen_at = v_now
  where match_id = p_match_id and user_id = p_user_id;

  if v_match.round_grace_deadline is not null and v_now >= v_match.round_grace_deadline then
    declare
      v_active_question_id uuid;
    begin
      select question_id into v_active_question_id
      from public.combat_match_questions
      where match_id = p_match_id and position = v_match.current_question_index;
      if v_active_question_id is not null then
        perform public.submit_combat_answer(p_match_id, p_user_id, v_active_question_id, null, v_match.time_limit_seconds * 1000);
        select * into v_match from public.combat_matches where id = p_match_id;
        if v_match.status <> 'active' then
          return v_match;
        end if;
      end if;
    end;
  end if;

  select * into v_me from public.combat_match_players where match_id = p_match_id and user_id = p_user_id;
  select * into v_other from public.combat_match_players where match_id = p_match_id and user_id <> p_user_id limit 1;
  if not found then
    raise exception 'The opponent has not joined this match.' using errcode = '55000';
  end if;

  v_me_stale := v_me.last_seen_at < v_now - interval '15 seconds';
  v_other_stale := v_other.last_seen_at < v_now - interval '15 seconds';

  if v_me_stale and v_other_stale then
    v_next_status := 'draw';
    v_winner_id := null;
  elsif v_other_stale then
    v_next_status := 'abandoned';
    v_winner_id := p_user_id;
  else
    update public.combat_match_players
    set last_seen_at = v_now
    where id = v_me.id;
    select * into v_match from public.combat_matches where id = p_match_id;
    return v_match;
  end if;

  update public.combat_matches
  set status = v_next_status,
      winner_id = v_winner_id,
      finished_at = v_now,
      round_grace_deadline = null,
      updated_at = v_now
  where id = p_match_id and status = 'active';

  perform public.settle_combat_wager(p_match_id, v_winner_id);
  select * into v_match from public.combat_matches where id = p_match_id;
  return v_match;
end;
$$;

create or replace function public.send_combat_message(
  p_match_id uuid,
  p_sender_id uuid,
  p_message text
)
returns public.combat_match_messages
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_match public.combat_matches;
  v_message public.combat_match_messages;
begin
  select * into v_match
  from public.combat_matches
  where id = p_match_id;

  if not found or (v_match.host_id <> p_sender_id and v_match.opponent_id <> p_sender_id) then
    raise exception 'Match not found.' using errcode = 'P0002';
  end if;
  if v_match.status not in ('waiting', 'ready', 'active') then
    raise exception 'This match is closed.' using errcode = '55000';
  end if;
  if p_message not in ('Good luck!', 'Nice one!', 'I’m ready!', 'That was close!') then
    raise exception 'That quick message is not available.' using errcode = '22023';
  end if;

  insert into public.combat_match_messages (match_id, sender_id, message)
  values (p_match_id, p_sender_id, p_message)
  returning * into v_message;
  return v_message;
end;
$$;

revoke all on function public.submit_combat_answer(uuid, uuid, uuid, text, integer) from public, anon, authenticated;
revoke all on function public.leave_combat_match(uuid, uuid) from public, anon, authenticated;
revoke all on function public.heartbeat_combat_match(uuid, uuid) from public, anon, authenticated;
revoke all on function public.send_combat_message(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.submit_combat_answer(uuid, uuid, uuid, text, integer) to service_role;
grant execute on function public.leave_combat_match(uuid, uuid) to service_role;
grant execute on function public.heartbeat_combat_match(uuid, uuid) to service_role;
grant execute on function public.send_combat_message(uuid, uuid, text) to service_role;

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'combat_match_messages') then
    alter publication supabase_realtime add table public.combat_match_messages;
  end if;
end;
$$;

comment on column public.combat_matches.round_grace_deadline is 'Server-owned deadline for the second player after the first player submits a round.';
comment on column public.combat_matches.winner_id is 'Authoritative winner for completed or abandonment outcomes; null for draws.';
