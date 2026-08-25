create table if not exists public.feedback_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  user_email text not null,
  display_name text not null,
  category text not null,
  message text not null,
  page_path text,
  status text not null default 'new',
  email_sent boolean not null default false,
  email_sent_at timestamptz,
  email_error text,
  created_at timestamptz not null default timezone('utc', now()),
  constraint feedback_submissions_category_check
    check (category in ('suggestion', 'bug', 'question', 'other')),
  constraint feedback_submissions_status_check
    check (status in ('new', 'in_progress', 'resolved', 'dismissed')),
  constraint feedback_submissions_message_length_check
    check (char_length(message) between 1 and 4000),
  constraint feedback_submissions_email_length_check
    check (char_length(user_email) between 3 and 320),
  constraint feedback_submissions_display_name_length_check
    check (char_length(display_name) between 1 and 120),
  constraint feedback_submissions_page_path_length_check
    check (page_path is null or char_length(page_path) between 1 and 160),
  constraint feedback_submissions_email_error_length_check
    check (email_error is null or char_length(email_error) <= 1000)
);

create index if not exists feedback_submissions_user_created_idx
  on public.feedback_submissions (user_id, created_at desc);

create index if not exists feedback_submissions_created_idx
  on public.feedback_submissions (created_at desc);

alter table public.feedback_submissions enable row level security;

revoke all on table public.feedback_submissions from anon, authenticated;
grant all on table public.feedback_submissions to service_role;
