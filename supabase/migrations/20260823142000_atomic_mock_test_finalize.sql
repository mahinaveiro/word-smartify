-- Canonical mock-test finalization. The caller supplies only the owner, test, and elapsed time;
-- answer correctness and the resulting score are derived from quiz_questions inside one lock.
create or replace function public.finalize_mock_test_canonical(
  p_test_id uuid,
  p_user_id uuid,
  p_time_taken_seconds integer
)
returns table (
  finalized boolean,
  id uuid,
  user_id uuid,
  total_questions integer,
  correct_answers integer,
  score integer,
  time_taken_seconds integer,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_test public.mock_tests%rowtype;
  v_answer_count integer;
  v_question_count integer;
  v_answered_count integer;
  v_correct integer;
  v_score integer;
  v_updated public.mock_tests%rowtype;
begin
  if p_test_id is null or p_user_id is null then
    raise exception 'A mock-test and owner are required.' using errcode = '22023';
  end if;
  if p_time_taken_seconds is null or p_time_taken_seconds < 0 or p_time_taken_seconds > 86400 then
    raise exception 'Invalid mock-test duration.' using errcode = '22023';
  end if;

  select * into v_test
  from public.mock_tests
  where id = p_test_id and user_id = p_user_id
  for update;
  if not found then
    raise exception 'Mock test not found.' using errcode = '42501';
  end if;

  if v_test.time_taken_seconds is not null then
    return query
      select false, v_test.id, v_test.user_id, v_test.total_questions,
             v_test.correct_answers, v_test.score, v_test.time_taken_seconds, v_test.created_at;
    return;
  end if;

  select count(*)::integer,
         count(*) filter (where user_answer is not null)::integer
    into v_answer_count, v_answered_count
  from public.mock_test_answers
  where test_id = p_test_id;

  select count(*)::integer
    into v_question_count
  from public.mock_test_answers answers
  join public.quiz_questions questions on questions.id = answers.question_id
  where answers.test_id = p_test_id;

  if v_answer_count <> v_test.total_questions or v_question_count <> v_test.total_questions then
    raise exception 'This mock test does not contain a complete unique question set.' using errcode = '23514';
  end if;

  update public.mock_test_answers answers
     set is_correct = answers.user_answer is not null
       and answers.user_answer = questions.correct_answer
    from public.quiz_questions questions
   where answers.test_id = p_test_id
     and questions.id = answers.question_id;

  select count(*)::integer
    into v_correct
  from public.mock_test_answers
  where test_id = p_test_id and user_answer is not null and is_correct;

  v_score := greatest(
    0,
    least(
      100,
      round((((v_correct - ((v_answered_count - v_correct) * 0.25)) / v_test.total_questions) * 100)::numeric)::integer
    )
  );

  update public.mock_tests
     set correct_answers = v_correct,
         score = v_score,
         time_taken_seconds = p_time_taken_seconds
   where id = p_test_id and time_taken_seconds is null
   returning * into v_updated;

  if not found then
    raise exception 'Mock test could not be finalized.' using errcode = '40001';
  end if;

  return query
    select true, v_updated.id, v_updated.user_id, v_updated.total_questions,
           v_updated.correct_answers, v_updated.score, v_updated.time_taken_seconds, v_updated.created_at;
end;
$$;

revoke all on function public.finalize_mock_test_canonical(uuid, uuid, integer) from public, anon, authenticated;
grant execute on function public.finalize_mock_test_canonical(uuid, uuid, integer) to service_role;
