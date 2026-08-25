BEGIN;

-- Remove confirmed malformed Bangla/gloss fragments from reported context questions.
UPDATE public.quiz_questions
SET question = $q$Choose the word that best completes the sentence: “An anonymous _____ donated a new library to the school.”$q$
WHERE id = '28f58b8c-efdc-5cfe-ac2a-4209c28132de'::uuid;

UPDATE public.quiz_questions
SET question = $q$Choose the word that best completes the sentence: “His speech was full of _____ clichés.”$q$
WHERE id = '3be96ca9-bba5-5f87-83c7-10b5923cb108'::uuid;

UPDATE public.quiz_questions
SET question = $q$Choose the word that best completes the sentence: “He was arrested for _____.”$q$
WHERE id = '51f5045f-f641-5699-848b-a1be6f0e9e55'::uuid;

UPDATE public.quiz_questions
SET question = $q$Choose the word that best completes the sentence: “She brought gifts to _____ her angry boss.”$q$
WHERE id = '675d759d-ccea-58ae-b12c-bcf2be252514'::uuid;

UPDATE public.quiz_questions
SET question = $q$Choose the word that best completes the sentence: “She showed a natural _____ for mathematics.”$q$
WHERE id = '8a1dc177-4222-5061-b7c4-97aecc1c049d'::uuid;

UPDATE public.quiz_questions
SET question = $q$Choose the word that best completes the sentence: “He belabored the same point for an hour without adding anything new.”$q$
WHERE id = '8ed9342d-31a3-52b4-8162-594806db56d2'::uuid;

UPDATE public.quiz_questions
SET question = $q$The _____ family needed support from friends.$q$
WHERE id = 'b1f6ce23-59e3-545c-a4c7-dd075c636484'::uuid;

UPDATE public.quiz_questions
SET question = $q$Choose the word that best completes the sentence: “Her taste in music was _____ — she liked everything.”$q$
WHERE id = 'b2430784-29f7-5348-9e60-8e21ae78b951'::uuid;

UPDATE public.quiz_questions
SET question = $q$Choose the word that best completes the sentence: “He always belittled others to feel superior.”$q$
WHERE id = 'b838b9e2-1031-520f-be5b-9cf97a6c3f0b'::uuid;

UPDATE public.quiz_questions
SET question = $q$Choose the word that best completes the sentence: “Good writing requires _____ and clarity.”$q$
WHERE id = 'd2520c58-81ef-59c7-aca7-a918aadb30b7'::uuid;

-- Repair explanations that pointed to nonexistent option pairs or failed to name the tested relationship.
UPDATE public.quiz_questions
SET explanation = $q$A bastion is a stronghold or source of protection, so it contrasts with weakness. “Ostensible” means apparent or seeming, while “actual” means real; this is the only clear contrast among the options.$q$
WHERE id = '055abb91-bee0-4d2b-8d89-cf0010980a2d'::uuid;

UPDATE public.quiz_questions
SET explanation = $q$“Beset” means to trouble, assail, or surround someone with difficulty, while “aid” means to help; the prompt therefore presents a clear contrast. “Porous” allows liquid or air to pass through, whereas “impermeable” does not, making “porous : impermeable” the only matching contrast pair.$q$
WHERE id = '868fbf8a-eaf8-4370-af6d-40ccdcfca178'::uuid;

UPDATE public.quiz_questions
SET question = $q$Choose the pair that shows the same synonym relationship as “Autocratic : dictatorial”.$q$,
    explanation = $q$“Autocratic” and “dictatorial” both describe controlling government or behavior through concentrated authority. “Duress” means coercion or forced pressure, so “duress : coercion” is the only matching synonym pair; the other options express contrast.$q$
WHERE id = '7d92dc5b-1415-4534-b6dd-533e9edd7594'::uuid;

-- Make reported synonym analogies unique by removing competing synonym pairs.
UPDATE public.quiz_questions
SET options = $json$["Prudent : reckless","brazen : bashful","Rancor : resentment","Gesticulate : remain still"]$json$::jsonb,
    correct_answer = $q$Rancor : resentment$q$,
    explanation = $q$“Animosity” and “hostility” are near-synonyms meaning strong ill will. “Rancor” and “resentment” also express deep-seated ill will, so “Rancor : resentment” is the only matching synonym pair. The other options show contrast or do not match the relationship.$q$
WHERE id = '0a48f7ec-23bb-49e7-bd0f-4cc26c753e35'::uuid;

UPDATE public.quiz_questions
SET options = $json$["shibboleth : independent thought","verbiage : wordiness","clout : impotence","deem : reject"]$json$::jsonb,
    correct_answer = $q$verbiage : wordiness$q$,
    explanation = $q$“Adduce” means to present something as evidence, and “cite” means to refer to evidence or an example; they form a near-synonym pair. “Verbiage” means an excess of words, and “wordiness” expresses the same idea, so “verbiage : wordiness” is the only matching synonym pair. The other options express contrast rather than synonymy.$q$
WHERE id = '1d5de191-996c-4f44-806d-b6edf2eb9cce'::uuid;

UPDATE public.quiz_questions
SET options = $json$["Capricious : steady","Salutary : beneficial","Edify : mislead","Poignant : indifferent"]$json$::jsonb,
    correct_answer = $q$Salutary : beneficial$q$,
    question = $q$Choose the pair that shows the same synonym relationship as “Apotheosis : epitome”.$q$,
    explanation = $q$“Apotheosis” and “epitome” are near-synonyms for the highest or most representative form of something. “Salutary” means beneficial, so “Salutary : beneficial” is the only matching synonym pair; the other options express contrast.$q$
WHERE id = '6cc71608-50b7-44cd-8693-ef77091e5f16'::uuid;

UPDATE public.quiz_questions
SET options = $json$["dilapidated : pristine","Admonish : praise","doughty : cowardly","invidious : causing envy or resentment"]$json$::jsonb,
    correct_answer = $q$invidious : causing envy or resentment$q$,
    explanation = $q$“Affiliate” means to become closely associated with another group or organization. “Invidious” means causing envy or resentment, so “invidious : causing envy or resentment” is the only word-to-definition pair. The other options express contrasts.$q$
WHERE id = '31db78cb-f78a-4d87-bb41-5f04694ec12f'::uuid;

UPDATE public.quiz_questions
SET options = $json$["lout : gentleman","Stricture : freedom","Steadfast : loyal","bauble : necessity"]$json$::jsonb,
    correct_answer = $q$Steadfast : loyal$q$,
    explanation = $q$“Ascetic” means self-denying and avoiding luxury. “Steadfast” means firmly loyal or constant, and “loyal” is its closest synonym; therefore, “Steadfast : loyal” is the only matching synonym pair.$q$
WHERE id = '4b9fe061-bcfd-4501-bd03-ef39bec63124'::uuid;

UPDATE public.quiz_questions
SET options = $json$["glistening : dull","amicable : friendly","arid : humid","arrears : prepayments"]$json$::jsonb,
    correct_answer = $q$amicable : friendly$q$,
    explanation = $q$“Aloof” and “distant” are near-synonyms meaning emotionally remote or uninvolved. “Amicable” and “friendly” are also near-synonyms, so “amicable : friendly” is the only matching synonym pair; the other options express contrasts.$q$
WHERE id = '545b5d27-a314-4fd1-b763-ba2b7107c08e'::uuid;

-- Remove competing synonym distractors from this reported synonym analogy while retaining the intended answer.
UPDATE public.quiz_questions
SET options = $json$["esoteric : commonplace","axiom : uncertainty","enigma : solution","grievous : tragic"]$json$::jsonb,
    correct_answer = $q$grievous : tragic$q$,
    explanation = $q$“Adventitious” means accidental or occurring by chance. “Grievous” means very serious or causing sorrow, while “tragic” describes something involving great sorrow or disaster; “grievous : tragic” is the only matching near-synonym pair. The other options express contrast or a different relationship.$q$
WHERE id = '07f39937-764c-41e1-ad94-4f5e710d1e57'::uuid;

-- Remove competing synonym/definition distractors from this reported analogy.
UPDATE public.quiz_questions
SET options = $json$["Tenable : defensible","Promulgate : suppress","imprudent : prudent","Bivouac : permanent base"]$json$::jsonb,
    correct_answer = $q$Tenable : defensible$q$,
    explanation = $q$“Altruism” and “selflessness” are near-synonyms describing concern for others without selfish motives. “Tenable” means defensible or supportable, so “Tenable : defensible” is the only matching synonym pair; the other options express contrast.$q$
WHERE id = 'fc11bd18-a9a4-4342-ac77-c6d6e5408d1c'::uuid;

COMMIT;
