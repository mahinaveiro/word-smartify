-- Keep library-loaded Word objects aligned with public.words after adding part_of_speech.
-- The function arguments, filters, ordering, pagination, and security posture remain unchanged.

drop function if exists public.search_library_words(text, uuid, uuid, text, integer, integer);

create function public.search_library_words(
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
  part_of_speech text,
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
      w.part_of_speech,
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
    part_of_speech,
    difficulty,
    created_at,
    total_count
  from matching_words;
$$;

revoke all on function public.search_library_words(text, uuid, uuid, text, integer, integer) from public;
grant execute on function public.search_library_words(text, uuid, uuid, text, integer, integer) to authenticated;
