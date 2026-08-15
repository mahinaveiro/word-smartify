-- Library saved words and bounded dictionary search.
-- User-owned rows are protected by RLS; curriculum search remains read-only.

create table if not exists public.saved_words (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  word_id uuid not null references public.words(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  constraint saved_words_user_word_key unique (user_id, word_id)
);

create index if not exists saved_words_user_created_idx
  on public.saved_words (user_id, created_at desc);

create index if not exists saved_words_word_idx
  on public.saved_words (word_id);

alter table public.saved_words enable row level security;

revoke all on table public.saved_words from anon;
grant select, insert, delete on table public.saved_words to authenticated;

drop policy if exists "saved_words_select_own" on public.saved_words;
create policy "saved_words_select_own"
  on public.saved_words
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "saved_words_insert_own" on public.saved_words;
create policy "saved_words_insert_own"
  on public.saved_words
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "saved_words_delete_own" on public.saved_words;
create policy "saved_words_delete_own"
  on public.saved_words
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create or replace function public.search_library_words(
  p_query text default '',
  p_book_id uuid default null,
  p_level_id uuid default null,
  p_letter text default null,
  p_limit integer default 24,
  p_offset integer default 0
)
returns table (
  id uuid,
  level_id uuid,
  book_word_number integer,
  word text,
  pronunciation text,
  english_meaning text,
  bangla_meaning text,
  example_sentence text,
  mnemonic text,
  synonyms text[],
  antonyms text[],
  difficulty text,
  created_at timestamptz,
  total_count bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  with normalized as (
    select nullif(btrim(coalesce(p_query, '')), '') as query_text,
           nullif(upper(left(btrim(coalesce(p_letter, '')), 1)), '') as letter_text,
           greatest(0, coalesce(p_offset, 0)) as safe_offset,
           least(100, greatest(1, coalesce(p_limit, 24))) as safe_limit
  ),
  matching_words as (
    select
      w.id,
      w.level_id,
      w.book_word_number,
      w.word,
      w.pronunciation,
      w.english_meaning,
      w.bangla_meaning,
      w.example_sentence,
      w.mnemonic,
      w.synonyms,
      w.antonyms,
      w.difficulty,
      w.created_at,
      b.display_order as book_display_order,
      l.level_number,
      count(*) over () as total_count
    from public.words w
    join public.levels l on l.id = w.level_id
    join public.chapters c on c.id = l.chapter_id
    join public.books b on b.id = c.book_id
    cross join normalized n
    where (p_book_id is null or b.id = p_book_id)
      and (p_level_id is null or l.id = p_level_id)
      and (n.letter_text is null or upper(left(w.word, 1)) = n.letter_text)
      and (
        n.query_text is null
        or w.word ilike '%' || n.query_text || '%'
        or w.english_meaning ilike '%' || n.query_text || '%'
        or coalesce(w.bangla_meaning, '') ilike '%' || n.query_text || '%'
        or coalesce(array_to_string(w.synonyms, ' '), '') ilike '%' || n.query_text || '%'
        or coalesce(array_to_string(w.antonyms, ' '), '') ilike '%' || n.query_text || '%'
      )
    order by b.display_order, l.level_number, w.book_word_number, w.id
    limit (select safe_limit from normalized)
    offset (select safe_offset from normalized)
  )
  select
    id,
    level_id,
    book_word_number,
    word,
    pronunciation,
    english_meaning,
    bangla_meaning,
    example_sentence,
    mnemonic,
    synonyms,
    antonyms,
    difficulty,
    created_at,
    total_count
  from matching_words;
$$;

revoke all on function public.search_library_words(text, uuid, uuid, text, integer, integer) from public;
grant execute on function public.search_library_words(text, uuid, uuid, text, integer, integer) to authenticated;
