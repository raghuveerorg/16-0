-- 16-0 free-play leaderboards (Classic & IQ).
-- Unlike the Daily (one shared deal, ranked by wins), free play is unlimited, so each completed game
-- adds points = wins + (sum of the XI's player strengths / 100). Boards rank by CUMULATIVE points,
-- so stronger teams and more plays both climb. Recorded only by the server after re-validation.

create table if not exists public.freeplay_results (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  mode        text not null check (mode in ('classic','iq')),
  day         date not null,                       -- server UTC day (for Today/Week windows)
  wins        smallint not null check (wins between 0 and 16),
  losses      smallint not null check (losses between 0 and 16),
  strength    integer  not null,                   -- sum of (bat + bowl) across the 11 players
  points      numeric(7,2) not null,               -- wins + strength/100 (server-computed)
  xi          jsonb    not null,                    -- 11 player ids (audit trail)
  captain_id  integer  not null,
  created_at  timestamptz not null default now()
);
create index if not exists freeplay_mode_day_idx on public.freeplay_results (mode, day);
create index if not exists freeplay_user_idx      on public.freeplay_results (user_id);

alter table public.freeplay_results enable row level security;
-- public READ for leaderboards; NO write policy => only the service role (after /api/submit-freeplay
-- re-validates and recomputes the score) can insert. Scores can't be forged via the DB.
drop policy if exists "freeplay public read" on public.freeplay_results;
create policy "freeplay public read" on public.freeplay_results for select using (true);

-- Cumulative points leaderboard for a mode over an optional date range (NULL bounds => all-time).
create or replace function public.freeplay_leaderboard(p_mode text, p_from date, p_to date, p_limit int default 100)
returns table (
  handle text, plays int, total_wins int, perfects int, best int, total_points numeric
) language sql stable as $$
  select p.handle,
         count(*)::int,
         sum(r.wins)::int,
         count(*) filter (where r.wins = 16)::int,
         max(r.wins)::int,
         round(sum(r.points), 1)
  from public.freeplay_results r
  join public.profiles p on p.id = r.user_id
  where r.mode = p_mode
    and (p_from is null or r.day >= p_from)
    and (p_to   is null or r.day <= p_to)
  group by p.handle
  order by sum(r.points) desc, count(*) desc, sum(r.wins) desc
  limit p_limit;
$$;
