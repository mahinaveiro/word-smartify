BEGIN;

-- Normalize the repaired synonym pair so the selected answer exactly matches its option.
UPDATE public.quiz_questions
SET options = $json$["Paradox : certainty","Abet : hinder","Avuncular : hostile","duress : coercion"]$json$::jsonb,
    correct_answer = $q$duress : coercion$q$
WHERE id = '7d92dc5b-1415-4534-b6dd-533e9edd7594'::uuid
  AND question_type = 'analogy_mcq'
  AND correct_answer = $q$duress : Coercion$q$;

COMMIT;
