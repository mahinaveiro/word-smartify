-- Word Smartify: persist whether a user has completed the study-GC invitation.
-- The existing profiles RLS policies already restrict writes to the profile owner.

alter table public.profiles
  add column if not exists study_gc_joined boolean not null default false;
