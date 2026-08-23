alter table public.question_reports
  drop constraint if exists question_reports_category_check;

alter table public.question_reports
  add constraint question_reports_category_check
  check (
    category in (
      'wrong_answer',
      'multiple_correct',
      'broken_question',
      'corrupted_text',
      'wrong_word_options',
      'wrong_explanation',
      'other',
      'faulty_question'
    )
  );
