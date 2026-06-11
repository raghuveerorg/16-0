-- 16-0 leaderboard aggregates (Today uses the existing daily_leaderboard()).
-- Aggregates a date range per player: games played, perfect 16-0 runs, best record,
-- total wins and average wins. NULL bounds => all-time. Read-only; safe for anon (public read).

create or replace function public.agg_leaderboard(p_from date, p_to date, p_limit int default 100)
returns table (
  handle text, plays int, perfects int, best int, total_wins int, avg_wins numeric
) language sql stable as $$
  select p.handle,
         count(*)::int,
         count(*) filter (where r.wins = 16)::int,
         max(r.wins)::int,
         sum(r.wins)::int,
         round(avg(r.wins), 2)
  from public.daily_results r
  join public.profiles p on p.id = r.user_id
  where (p_from is null or r.day >= p_from)
    and (p_to   is null or r.day <= p_to)
  group by p.handle
  order by count(*) filter (where r.wins = 16) desc,  -- most perfect 16-0 runs
           sum(r.wins) desc,                           -- then most total wins
           avg(r.wins) desc,                           -- then highest average
           count(*) desc                               -- then most games played
  limit p_limit;
$$;
