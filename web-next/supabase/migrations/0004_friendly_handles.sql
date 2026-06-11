-- Friendly leaderboard handles.
-- Problem: new users got 'player_4c3ab1c1'-style handles, which makes the leaderboard look fake/empty.
-- Fix: generate readable cricket-flavoured names (e.g. 'GoldenYorker27'), use them for new sign-ups,
-- and backfill every existing 'player_xxxxxxxx' handle. Users can rename themselves on /profile
-- (the existing "user updates own profile" RLS policy already permits it).

-- ---------- random readable handle ----------
create or replace function public.generate_handle()
returns text language plpgsql volatile as $$
declare
  adj  text[] := array['Golden','Flying','Swinging','Reverse','Crafty','Fearless','Vintage','Mighty',
                       'Clutch','Streaky','Lofted','Spinning','Rapid','Silky','Casual','Maximum'];
  noun text[] := array['CoverDrive','Yorker','Googly','Slogger','Finisher','Opener','AllRounder',
                       'NightWatch','Doosra','Bouncer','UpperCut','SquareCut','Sweeper','FlickShot',
                       'ThirdMan','MidWicket'];
  h text;
begin
  for i in 1..25 loop
    h := adj[1 + floor(random() * array_length(adj, 1))::int]
      || noun[1 + floor(random() * array_length(noun, 1))::int]
      || (1 + floor(random() * 99))::int;
    exit when not exists (select 1 from public.profiles where handle = h);
  end loop;
  return h; -- unique constraint is the final backstop on the ~impossible 25-collision streak
end $$;

-- ---------- new sign-ups get a friendly handle ----------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, handle)
  values (new.id, public.generate_handle())
  on conflict (id) do nothing;
  return new;
end; $$;

-- ---------- backfill existing auto-generated handles ----------
update public.profiles
set handle = public.generate_handle()
where handle like 'player\_%' escape '\';

-- ---------- sane bounds for self-chosen handles (3-20 chars, letters/digits/underscore) ----------
alter table public.profiles drop constraint if exists profiles_handle_format;
alter table public.profiles add constraint profiles_handle_format
  check (handle ~ '^[A-Za-z0-9_]{3,20}$');
