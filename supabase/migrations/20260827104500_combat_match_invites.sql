create table if not exists public.combat_match_invites (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.combat_matches(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled', 'expired')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint combat_match_invites_distinct_users check (sender_id <> recipient_id),
  unique (match_id, recipient_id)
);

create index if not exists combat_match_invites_recipient_idx on public.combat_match_invites (recipient_id, status, created_at desc);
create index if not exists combat_match_invites_sender_idx on public.combat_match_invites (sender_id, status, created_at desc);

alter table public.combat_match_invites enable row level security;

create policy combat_match_invites_select_participant on public.combat_match_invites
  for select to authenticated
  using (auth.uid() = sender_id or auth.uid() = recipient_id);
create policy combat_match_invites_insert_sender on public.combat_match_invites
  for insert to authenticated
  with check (auth.uid() = sender_id and sender_id <> recipient_id);
create policy combat_match_invites_update_participant on public.combat_match_invites
  for update to authenticated
  using (auth.uid() = sender_id or auth.uid() = recipient_id)
  with check (auth.uid() = sender_id or auth.uid() = recipient_id);

revoke all on table public.combat_match_invites from anon, authenticated;
grant select, insert, update on table public.combat_match_invites to authenticated;
grant all on table public.combat_match_invites to service_role;

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'combat_match_invites') then
    alter publication supabase_realtime add table public.combat_match_invites;
  end if;
end;
$$;
