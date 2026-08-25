-- Word Smartify: persist the user's light/dark theme preference on their profile.
-- Existing profiles RLS policies already restrict profile writes to the profile owner.

alter table public.profiles
  add column if not exists theme_preference text not null default 'light';

alter table public.profiles
  drop constraint if exists profiles_theme_preference_check;

alter table public.profiles
  add constraint profiles_theme_preference_check
  check (theme_preference in ('light', 'dark'));
