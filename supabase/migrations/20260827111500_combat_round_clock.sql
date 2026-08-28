-- Each Combat round gets its own server-owned start time.
-- This prevents early answers in one round from silently consuming time
-- from later rounds and keeps both players on the same deadline.

alter table public.combat_matches
  add column if not exists current_question_started_at timestamptz;

update public.combat_matches
set current_question_started_at = started_at
where status = 'active'
  and current_question_started_at is null;
