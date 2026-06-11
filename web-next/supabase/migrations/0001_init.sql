-- 16-0 backend schema (Supabase / Postgres)
-- Tables: profiles, daily_results. Plus rank + streak SQL functions.
-- Security model: the ONLY write path for daily_results is the server (/api/submit) using the
-- service-role key AFTER it recomputes the score. Clients can READ (for leaderboards/history) but
-- cannot INSERT/UPDATE — so scores can't be forged by calling the DB directly.

-- ---------- profiles ----------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  handle      text unique,
  created_at  timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- everyone can read handles (leaderboards show them); a user manages only their own row
create policy "profiles are public readable" on public.profiles for select using (true);
create policy "user upserts own profile"      on public.profiles for insert with check (auth.uid() = id);
create policy "user updates own profile"       on public.profiles for update using (auth.uid() = id);

-- auto-create a profile row when a new auth user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, handle)
  values (new.id, 'player_' || left(replace(new.id::text, '-', ''), 8))
  on conflict (id) do nothing;
  return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- daily_results ----------
create table if not exists public.daily_results (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  day         date not null,                      -- the Daily Challenge date (server's UTC day)
  wins        smallint not null check (wins between 0 and 16),
  losses      smallint not null check (losses between 0 and 16),
  xi          jsonb not null,                     -- array of 11 player ids (audit trail)
  captain_id  integer not null,
  created_at  timestamptz not null default now(),
  unique (user_id, day)                           -- DB-enforced one play per day
);
create index if not exists daily_results_day_wins_idx on public.daily_results (day, wins desc);
create index if not exists daily_results_user_idx     on public.daily_results (user_id, day);

alter table public.daily_results enable row level security;
-- public READ for leaderboards/rank; NO insert/update/delete policy => clients can't write.
-- Only the service-role key (used by /api/submit after validation) bypasses RLS to insert.
create policy "results are public readable" on public.daily_results for select using (true);

-- ---------- rank on a given day (1 = best; ties share the better rank) ----------
create or replace function public.day_rank(p_user uuid, p_day date)
returns table (rank int, total int) language sql stable as $$
  with d as (select wins from public.daily_results where day = p_day),
       me as (select wins from public.daily_results where day = p_day and user_id = p_user)
  select (select count(*) + 1 from d where d.wins > (select wins from me))::int as rank,
         (select count(*) from d)::int as total;
$$;

-- ---------- a user's daily-rank history (most recent first) ----------
create or replace function public.rank_history(p_user uuid, p_limit int default 60)
returns table (day date, wins smallint, losses smallint, rank int, total int) language sql stable as $$
  select r.day, r.wins, r.losses,
         (1 + (select count(*) from public.daily_results o where o.day = r.day and o.wins > r.wins))::int as rank,
         (select count(*) from public.daily_results o where o.day = r.day)::int as total
  from public.daily_results r
  where r.user_id = p_user
  order by r.day desc
  limit p_limit;
$$;

-- ---------- current + longest streak of consecutive played days (ending today/yesterday) ----------
create or replace function public.user_streak(p_user uuid)
returns table (current_streak int, longest_streak int, last_day date) language sql stable as $$
  with days as (
    select distinct day from public.daily_results where user_id = p_user
  ),
  grp as (                                  -- gaps-and-islands: consecutive dates share (day - rownum)
    select day, day - (row_number() over (order by day))::int as g from days
  ),
  islands as (
    select min(day) as start_day, max(day) as end_day, count(*)::int as len
    from grp group by g
  )
  select
    coalesce((select len from islands
              where end_day >= (current_date - interval '1 day') order by end_day desc limit 1), 0)::int,
    coalesce((select max(len) from islands), 0)::int,
    (select max(day) from days);
$$;

-- ---------- daily leaderboard (top N for a day, with handles) ----------
create or replace function public.daily_leaderboard(p_day date, p_limit int default 100)
returns table (rank int, handle text, wins smallint, losses smallint) language sql stable as $$
  select (rank() over (order by r.wins desc))::int, p.handle, r.wins, r.losses
  from public.daily_results r join public.profiles p on p.id = r.user_id
  where r.day = p_day
  order by r.wins desc, r.created_at asc
  limit p_limit;
$$;
