-- Combat/social foundation.
-- This release is invite-only, non-wagered, and uses server-owned match state.
-- Question snapshots keep the active match deterministic and are never exposed
-- through the browser's normal authenticated table access.

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  addressee_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled', 'removed')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint friendships_distinct_users check (requester_id <> addressee_id)
);

create unique index if not exists friendships_one_pair_idx
  on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
create index if not exists friendships_addressee_status_idx
  on public.friendships (addressee_id, status, created_at desc);
create index if not exists friendships_requester_status_idx
  on public.friendships (requester_id, status, created_at desc);

create table if not exists public.user_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint user_blocks_distinct_users check (blocker_id <> blocked_id)
);

create table if not exists public.user_privacy (
  user_id uuid primary key references auth.users(id) on delete cascade,
  discoverable boolean not null default true,
  friend_challenges_enabled boolean not null default true,
  presence_visible boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.user_presence (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state text not null default 'offline' check (state in ('online', 'learning', 'reviewing', 'mock_test', 'in_combat', 'idle', 'offline')),
  last_seen_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_presence_recent_idx on public.user_presence (state, last_seen_at desc);

create table if not exists public.combat_matches (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references auth.users(id) on delete restrict,
  opponent_id uuid references auth.users(id) on delete restrict,
  visibility text not null default 'private' check (visibility = 'private'),
  join_code text not null unique,
  preset text not null default 'sprint' check (preset in ('sprint', 'standard', 'custom')),
  question_count integer not null default 5 check (question_count between 3 and 20),
  time_limit_seconds integer not null default 15 check (time_limit_seconds between 5 and 60),
  status text not null default 'waiting' check (status in ('waiting', 'ready', 'active', 'completed', 'draw', 'cancelled', 'expired', 'abandoned', 'no_contest')),
  current_question_index integer not null default 0 check (current_question_index between 0 and 20),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 minutes'),
  started_at timestamptz,
  finished_at timestamptz,
  cancelled_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint combat_matches_distinct_players check (opponent_id is null or host_id <> opponent_id)
);

create index if not exists combat_matches_host_status_idx on public.combat_matches (host_id, status, created_at desc);
create index if not exists combat_matches_opponent_status_idx on public.combat_matches (opponent_id, status, created_at desc);
create index if not exists combat_matches_waiting_idx on public.combat_matches (status, expires_at);

create table if not exists public.combat_match_players (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.combat_matches(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  slot integer not null check (slot in (1, 2)),
  is_ready boolean not null default false,
  correct_count integer not null default 0 check (correct_count between 0 and 20),
  answered_count integer not null default 0 check (answered_count between 0 and 20),
  total_time_ms bigint not null default 0 check (total_time_ms >= 0),
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (match_id, user_id),
  unique (match_id, slot)
);

create index if not exists combat_match_players_user_idx on public.combat_match_players (user_id, joined_at desc);

create table if not exists public.combat_match_questions (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.combat_matches(id) on delete cascade,
  question_id uuid not null references public.quiz_questions(id) on delete restrict,
  word_id uuid not null references public.words(id) on delete restrict,
  position integer not null check (position between 0 and 19),
  question text not null,
  options jsonb not null,
  correct_answer text not null,
  explanation text,
  created_at timestamptz not null default now(),
  unique (match_id, position),
  unique (match_id, question_id)
);

create index if not exists combat_match_questions_match_idx on public.combat_match_questions (match_id, position);

create table if not exists public.combat_match_answers (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.combat_matches(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id uuid not null references public.quiz_questions(id) on delete restrict,
  selected_answer text,
  is_correct boolean not null,
  response_time_ms integer not null default 0 check (response_time_ms >= 0),
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (match_id, user_id, question_id)
);

create index if not exists combat_match_answers_match_idx on public.combat_match_answers (match_id, submitted_at);

create table if not exists public.combat_match_reports (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.combat_matches(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (reason in ('question', 'connection', 'cheating', 'harassment', 'other')),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists combat_match_reports_match_idx on public.combat_match_reports (match_id, created_at desc);

-- Ensure future users have sane defaults without touching existing profile data.
insert into public.user_privacy (user_id)
select id from auth.users
on conflict (user_id) do nothing;

alter table public.friendships enable row level security;
alter table public.user_blocks enable row level security;
alter table public.user_privacy enable row level security;
alter table public.user_presence enable row level security;
alter table public.combat_matches enable row level security;
alter table public.combat_match_players enable row level security;
alter table public.combat_match_questions enable row level security;
alter table public.combat_match_answers enable row level security;
alter table public.combat_match_reports enable row level security;

create or replace function public.is_accepted_friend(p_user_id uuid, p_other_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.friendships f
    where f.status = 'accepted'
      and ((f.requester_id = p_user_id and f.addressee_id = p_other_user_id)
        or (f.requester_id = p_other_user_id and f.addressee_id = p_user_id))
  );
$$;

revoke all on function public.is_accepted_friend(uuid, uuid) from public, anon;
grant execute on function public.is_accepted_friend(uuid, uuid) to authenticated;

create policy friendships_select_participant on public.friendships
  for select to authenticated
  using (auth.uid() = requester_id or auth.uid() = addressee_id);
create policy friendships_insert_requester on public.friendships
  for insert to authenticated
  with check (auth.uid() = requester_id and requester_id <> addressee_id);
create policy friendships_update_participant on public.friendships
  for update to authenticated
  using (auth.uid() = requester_id or auth.uid() = addressee_id)
  with check (auth.uid() = requester_id or auth.uid() = addressee_id);
create policy friendships_delete_participant on public.friendships
  for delete to authenticated
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

create policy user_blocks_select_owner on public.user_blocks
  for select to authenticated
  using (auth.uid() = blocker_id);
create policy user_blocks_insert_owner on public.user_blocks
  for insert to authenticated
  with check (auth.uid() = blocker_id and blocker_id <> blocked_id);
create policy user_blocks_delete_owner on public.user_blocks
  for delete to authenticated
  using (auth.uid() = blocker_id);

create policy user_privacy_select_owner on public.user_privacy
  for select to authenticated
  using (auth.uid() = user_id);
create policy user_privacy_insert_owner on public.user_privacy
  for insert to authenticated
  with check (auth.uid() = user_id);
create policy user_privacy_update_owner on public.user_privacy
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy user_presence_select_visible on public.user_presence
  for select to authenticated
  using (
    auth.uid() = user_id
    or (
      public.is_accepted_friend(auth.uid(), user_id)
      and coalesce((select p.presence_visible from public.user_privacy p where p.user_id = user_id), true)
    )
  );
create policy user_presence_insert_owner on public.user_presence
  for insert to authenticated
  with check (auth.uid() = user_id);
create policy user_presence_update_owner on public.user_presence
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy combat_matches_select_participant on public.combat_matches
  for select to authenticated
  using (auth.uid() = host_id or auth.uid() = opponent_id);
create policy combat_match_players_select_participant on public.combat_match_players
  for select to authenticated
  using (exists (
    select 1 from public.combat_matches m
    where m.id = match_id and (m.host_id = auth.uid() or m.opponent_id = auth.uid())
  ));
create policy combat_match_questions_no_direct_read on public.combat_match_questions
  for select to authenticated
  using (false);
create policy combat_match_answers_select_own on public.combat_match_answers
  for select to authenticated
  using (auth.uid() = user_id);
create policy combat_match_reports_select_reporter on public.combat_match_reports
  for select to authenticated
  using (auth.uid() = reporter_id);
create policy combat_match_reports_insert_reporter on public.combat_match_reports
  for insert to authenticated
  with check (auth.uid() = reporter_id);

revoke all on table public.combat_matches from anon, authenticated;
revoke all on table public.combat_match_players from anon, authenticated;
revoke all on table public.combat_match_questions from anon, authenticated;
revoke all on table public.combat_match_answers from anon, authenticated;
revoke all on table public.combat_match_reports from anon, authenticated;

grant select on table public.combat_matches to authenticated;
grant select on table public.combat_match_players to authenticated;
grant select on table public.combat_match_answers to authenticated;
grant select, insert on table public.combat_match_reports to authenticated;
grant all on table public.combat_matches to service_role;
grant all on table public.combat_match_players to service_role;
grant all on table public.combat_match_questions to service_role;
grant all on table public.combat_match_answers to service_role;
grant all on table public.combat_match_reports to service_role;

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'combat_matches') then
    alter publication supabase_realtime add table public.combat_matches;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'combat_match_players') then
    alter publication supabase_realtime add table public.combat_match_players;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'combat_match_questions') then
    alter publication supabase_realtime add table public.combat_match_questions;
  end if;
end;
$$;
