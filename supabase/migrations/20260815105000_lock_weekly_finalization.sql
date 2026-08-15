-- Weekly finalization is scheduler-owned. Ordinary authenticated users must not
-- be able to mutate finalized historical ranks by invoking this function.
revoke all on function public.finalize_weekly_leaderboard(date) from public, anon, authenticated;
