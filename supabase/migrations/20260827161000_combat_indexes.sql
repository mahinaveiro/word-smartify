-- Cover Combat foreign keys used by answer, question, message, and result lookups.
-- These indexes are additive and do not change match semantics or access control.
create index if not exists combat_match_answers_question_idx
  on public.combat_match_answers (question_id);
create index if not exists combat_match_answers_user_idx
  on public.combat_match_answers (user_id);
create index if not exists combat_match_questions_question_idx
  on public.combat_match_questions (question_id);
create index if not exists combat_match_questions_word_idx
  on public.combat_match_questions (word_id);
create index if not exists combat_match_messages_sender_idx
  on public.combat_match_messages (sender_id);
create index if not exists combat_matches_wager_winner_idx
  on public.combat_matches (wager_winner_id);
create index if not exists combat_matches_winner_idx
  on public.combat_matches (winner_id);
create index if not exists combat_wager_ledger_user_idx
  on public.combat_wager_ledger (user_id);

analyze public.combat_match_answers;
analyze public.combat_match_questions;
analyze public.combat_match_messages;
analyze public.combat_matches;
analyze public.combat_wager_ledger;
