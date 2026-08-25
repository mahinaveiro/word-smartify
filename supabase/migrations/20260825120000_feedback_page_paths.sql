alter table public.feedback_submissions
  add column if not exists page_paths text[];

alter table public.feedback_submissions
  add constraint feedback_submissions_page_paths_check
    check (page_paths is null or (cardinality(page_paths) between 1 and 14));
