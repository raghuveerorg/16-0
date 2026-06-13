-- Migration 0002: freeplay_results table, index, and leaderboard function.
-- freeplay_results stores Classic + Cricket IQ games for the all-time leaderboard.
-- Write path: only /api/submit-freeplay (service-role key, after server-side re-validation).
-- Clients have SELECT access for leaderboard reads.

-- ---------- freeplay_results ----------
create table if not exists public.freeplay_results (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  mode        text not null check (mode in ('classic', 'iq')),
  day         date not null,                         -- IST server date at time of play
  wins        smallint not null check (wins between 0 and 16),
  losses      smallint not null check (losses between 0 and 16),
  strength    integer not null,                      -- sum of bat + bowl across all 11 players
  points      numeric(8, 2) not null,                -- wins + strength / 100
  xi          jsonb not null,                        -- array of 11 player ids (audit trail)
  captain_id  integer not null,
  created_at  timestamptz not null default now()
);

-- Optimise leaderboard queries: top points per mode, per day
create index if not exists freeplay_results_mode_points_idx
  on public.freeplay_results (mode, points desc, created_at asc);

create index if not exists freeplay_results_user_idx
  on public.freeplay_results (user_id, created_at desc);

alter table public.freeplay_results enable row level security;

-- Public READ for leaderboards; no INSERT/UPDATE/DELETE policy — clients cannot write.
-- Only the service-role key (used by /api/submit-freeplay) bypasses RLS.
create policy "freeplay results are public readable"
  on public.freeplay_results for select using (true);

-- ---------- freeplay_leaderboard ----------
-- Returns top N entries for a given mode, joined with the player's public handle.
-- Used by the Classic / Cricket IQ all-time leaderboard pages.
create or replace function public.freeplay_leaderboard(
  p_mode text,
  p_limit int default 50
)
returns table (
  rank        int,
  handle      text,
  wins        smallint,
  points      numeric,
  played_at   timestamptz
)
language sql stable as $$
  select
    row_number() over (order by fr.points desc, fr.created_at asc)::int as rank,
    coalesce(pr.handle, 'anon')                                          as handle,
    fr.wins,
    fr.points,
    fr.created_at                                                        as played_at
  from public.freeplay_results fr
  left join public.profiles pr on pr.id = fr.user_id
  where fr.mode = p_mode
  order by fr.points desc, fr.created_at asc
  limit p_limit;
$$;
