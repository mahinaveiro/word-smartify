-- Combat lifecycle correction: select Smart questions only after both players join,
-- and use only the server-owned 10-second grace window after the first answer.
-- All functions remain callable only through the authenticated server boundary.

create or replace function public.start_combat_match(
  p_match_id uuid,
  p_user_id uuid,
  p_questions jsonb default null
)
returns public.combat_matches
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_match public.combat_matches;
  v_now timestamptz := clock_timestamp();
  v_question jsonb;
  v_position integer;
  v_player_count integer;
  v_ready_count integer;
begin
  select * into v_match
  from public.combat_matches
  where id = p_match_id
  for update;

  if not found or (v_match.host_id <> p_user_id and v_match.opponent_id <> p_user_id) then
    raise exception 'Match not found.' using errcode = 'P0002';
  end if;
  if v_match.status <> 'ready' then
    raise exception 'Both players must be ready before the match starts.' using errcode = '55000';
  end if;

  select count(*), count(*) filter (where is_ready)
  into v_player_count, v_ready_count
  from public.combat_match_players
  where match_id = p_match_id;
  if v_player_count <> 2 or v_ready_count <> 2 then
    raise exception 'Both players must be ready before the match starts.' using errcode = '55000';
  end if;

  if p_questions is not null then
    if jsonb_typeof(p_questions) <> 'array' or jsonb_array_length(p_questions) <> v_match.question_count then
      raise exception 'The selected question set is not complete.' using errcode = '22023';
    end if;

    delete from public.combat_match_questions
    where match_id = p_match_id;

    for v_question, v_position in
      select value, (ordinality - 1)::integer
      from jsonb_array_elements(p_questions) with ordinality
    loop
      if jsonb_typeof(v_question) <> 'object'
        or nullif(v_question->>'question_id', '') is null
        or nullif(v_question->>'word_id', '') is null
        or nullif(v_question->>'question', '') is null
        or nullif(v_question->>'correct_answer', '') is null
        or jsonb_typeof(v_question->'options') <> 'array'
        or jsonb_array_length(v_question->'options') < 3
        or not (v_question->'options' @> to_jsonb(v_question->>'correct_answer')) then
        raise exception 'The selected question set contains an invalid question.' using errcode = '22023';
      end if;

      insert into public.combat_match_questions (
        match_id,
        question_id,
        word_id,
        position,
        question,
        options,
        correct_answer,
        explanation
      )
      values (
        p_match_id,
        (v_question->>'question_id')::uuid,
        (v_question->>'word_id')::uuid,
        v_position,
        v_question->>'question',
        v_question->'options',
        v_question->>'correct_answer',
        v_question->>'explanation'
      );
    end loop;
  end if;

  update public.combat_matches
  set status = 'active',
      started_at = v_now,
      current_question_index = 0,
      current_question_started_at = v_now,
      round_grace_deadline = null,
      winner_id = null,
      updated_at = v_now
  where id = p_match_id and status = 'ready';

  select * into v_match
  from public.combat_matches
  where id = p_match_id;
  return v_match;
end;
$$;

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
  v_elapsed_ms integer;
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
  v_elapsed_ms := greatest(0, least(2147483647, floor(extract(epoch from (v_now - v_round_started_at)) * 1000)::bigint))::integer;

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
    update public.combat_matches
    set round_grace_deadline = v_now + interval '10 seconds',
        updated_at = v_now
    where id = p_match_id and status = 'active' and current_question_index = v_match.current_question_index;
    v_match.round_grace_deadline := v_now + interval '10 seconds';
  end if;

  if v_answer_count < 2 and v_match.round_grace_deadline is not null and v_now >= v_match.round_grace_deadline then
    insert into public.combat_match_answers (match_id, user_id, question_id, selected_answer, is_correct, response_time_ms, submitted_at)
    select p_match_id, player.user_id, p_question_id, null, false, v_elapsed_ms, v_now
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

revoke all on function public.start_combat_match(uuid, uuid, jsonb) from public, anon, authenticated;
revoke all on function public.submit_combat_answer(uuid, uuid, uuid, text, integer) from public, anon, authenticated;
grant execute on function public.start_combat_match(uuid, uuid, jsonb) to service_role;
grant execute on function public.submit_combat_answer(uuid, uuid, uuid, text, integer) to service_role;

comment on function public.start_combat_match(uuid, uuid, jsonb) is 'Starts a ready Combat match atomically; optional server-generated question payload is used for Smart shared-word matches.';
comment on function public.submit_combat_answer(uuid, uuid, uuid, text, integer) is 'Records a Combat answer with no normal round timeout; only the server-owned 10-second grace deadline can auto-submit a missing answer.';
