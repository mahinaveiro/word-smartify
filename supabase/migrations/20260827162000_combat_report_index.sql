-- Cover reporter lookups while preserving the existing match/time index.
create index if not exists combat_match_reports_reporter_idx
  on public.combat_match_reports (reporter_id, created_at desc);

analyze public.combat_match_reports;
