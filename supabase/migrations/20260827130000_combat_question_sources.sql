-- Combat source selection is optional and defaults to the existing mixed eligible pool.
alter table public.combat_matches
  add column if not exists question_source jsonb not null default '{"mode":"mixed"}'::jsonb;

alter table public.combat_matches
  drop constraint if exists combat_matches_question_source_shape;

alter table public.combat_matches
  add constraint combat_matches_question_source_shape
  check (
    jsonb_typeof(question_source) = 'object'
    and question_source ? 'mode'
    and question_source->>'mode' in ('mixed', 'level', 'book', 'letter', 'smart')
  );

comment on column public.combat_matches.question_source is 'Server-validated source selector for the shared combat question pool.';
