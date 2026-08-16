create table if not exists public.question_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id uuid references public.quiz_questions(id) on delete set null,
  word_id uuid references public.words(id) on delete set null,
  category text not null check (category in ('wrong_answer', 'faulty_question', 'other')),
  note text check (note is null or char_length(note) <= 1000),
  mode text not null default 'learning' check (mode in ('learning', 'review', 'challenge', 'mock_test', 'library')),
  question_text text not null,
  question_type text not null,
  options jsonb,
  correct_answer text not null,
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists question_reports_created_at_idx
  on public.question_reports (created_at desc);

create index if not exists question_reports_status_created_at_idx
  on public.question_reports (status, created_at desc);

create index if not exists question_reports_user_created_at_idx
  on public.question_reports (user_id, created_at desc);

alter table public.question_reports enable row level security;

revoke all on table public.question_reports from anon, authenticated;
grant insert on table public.question_reports to authenticated;

drop policy if exists question_reports_authenticated_insert on public.question_reports;
create policy question_reports_authenticated_insert
  on public.question_reports
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);
