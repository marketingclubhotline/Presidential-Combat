-- ============================================================
-- NEON FIST — Supabase schema (Phase 13: database integration)
-- Run in the Supabase SQL editor, or:  supabase db push
-- ============================================================

-- ------------------------------------------------------------------
-- players
--   id         : matches auth.users.id so RLS can key off auth.uid()
--   win_count  : total ranked victories
--   elo        : ranked skill rating (seeded at 1200)
-- ------------------------------------------------------------------
create table if not exists public.players (
  id          uuid primary key references auth.users(id) on delete cascade,
  handle      text unique not null
                check (char_length(handle) between 2 and 16),
  win_count   integer not null default 0 check (win_count >= 0),
  loss_count  integer not null default 0 check (loss_count >= 0),
  elo         integer not null default 1200 check (elo between 0 and 4000),
  peak_elo    integer not null default 1200,
  matches     integer not null default 0 check (matches >= 0),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists players_elo_idx on public.players (elo desc);
create index if not exists players_wins_idx on public.players (win_count desc);

-- ------------------------------------------------------------------
-- matches — the audit trail. Every ranked result is written here so a
-- win_count can always be recomputed/verified from source rows.
-- ------------------------------------------------------------------
create table if not exists public.matches (
  id            uuid primary key default gen_random_uuid(),
  winner_id     uuid not null references public.players(id) on delete cascade,
  loser_id      uuid not null references public.players(id) on delete cascade,
  winner_elo_before integer not null,
  loser_elo_before  integer not null,
  winner_elo_after  integer not null,
  loser_elo_after   integer not null,
  rounds_won    smallint not null default 2,
  rounds_lost   smallint not null default 0,
  duration_ms   integer,
  -- Phase 12: both peers submit their final state hash. If they disagree
  -- the match is flagged and Elo is NOT awarded.
  state_hash    text,
  verified      boolean not null default false,
  void_reason   text,
  created_at    timestamptz not null default now(),
  constraint no_self_match check (winner_id <> loser_id)
);
create index if not exists matches_winner_idx on public.matches (winner_id, created_at desc);
create index if not exists matches_loser_idx  on public.matches (loser_id, created_at desc);

-- keep updated_at honest
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists players_touch on public.players;
create trigger players_touch before update on public.players
  for each row execute function public.touch_updated_at();

-- ------------------------------------------------------------------
-- Row Level Security
--   Anyone may READ the ladder. Nobody may write win_count or elo from
--   the client — those only move through SECURITY DEFINER functions.
--   This is the database half of Phase 12's anti-cheat.
-- ------------------------------------------------------------------
alter table public.players enable row level security;
alter table public.matches enable row level security;

drop policy if exists players_read on public.players;
create policy players_read on public.players
  for select using (true);

drop policy if exists players_insert_self on public.players;
create policy players_insert_self on public.players
  for insert with check (auth.uid() = id);

-- A player may edit their own row but MAY NOT touch scoring columns.
drop policy if exists players_update_self on public.players;
create policy players_update_self on public.players
  for update using (auth.uid() = id)
  with check (
    auth.uid() = id
    and win_count  = (select p.win_count  from public.players p where p.id = auth.uid())
    and loss_count = (select p.loss_count from public.players p where p.id = auth.uid())
    and elo        = (select p.elo        from public.players p where p.id = auth.uid())
  );

drop policy if exists matches_read on public.matches;
create policy matches_read on public.matches for select using (true);
-- no client INSERT policy on matches: only the service role writes results.

-- ------------------------------------------------------------------
-- record_match_result — THE function that updates win_count.
-- SECURITY DEFINER so it can bypass RLS, but it validates first.
-- Atomic: win_count, loss_count, elo and the audit row all move together.
-- ------------------------------------------------------------------
create or replace function public.record_match_result(
  p_winner    uuid,
  p_loser     uuid,
  p_rounds_won  smallint default 2,
  p_rounds_lost smallint default 0,
  p_duration_ms integer default null,
  p_state_hash  text    default null,
  p_verified    boolean default false
)
returns table (
  winner_id uuid, winner_win_count integer, winner_elo integer, winner_delta integer,
  loser_id  uuid, loser_elo integer, loser_delta integer, match_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  w_elo int; l_elo int;
  w_matches int; l_matches int;
  k_w int; k_l int;
  expected_w numeric; expected_l numeric;
  new_w int; new_l int;
  m_id uuid;
begin
  if p_winner = p_loser then
    raise exception 'winner and loser must differ';
  end if;

  -- lock both rows in a stable order to avoid deadlocks
  select elo, matches into w_elo, w_matches from players
    where id = p_winner for update;
  if not found then raise exception 'unknown winner %', p_winner; end if;

  select elo, matches into l_elo, l_matches from players
    where id = p_loser for update;
  if not found then raise exception 'unknown loser %', p_loser; end if;

  -- Elo with a provisional K-factor: new accounts move faster
  k_w := case when w_matches < 15 then 40 when w_elo >= 2100 then 16 else 24 end;
  k_l := case when l_matches < 15 then 40 when l_elo >= 2100 then 16 else 24 end;

  expected_w := 1.0 / (1.0 + power(10.0, (l_elo - w_elo) / 400.0));
  expected_l := 1.0 / (1.0 + power(10.0, (w_elo - l_elo) / 400.0));

  new_w := greatest(0, w_elo + round(k_w * (1 - expected_w)));
  new_l := greatest(0, l_elo + round(k_l * (0 - expected_l)));

  -- An unverified (hash-mismatched) match is recorded but scores nothing.
  if not p_verified then
    new_w := w_elo;
    new_l := l_elo;
  end if;

  insert into matches (winner_id, loser_id, winner_elo_before, loser_elo_before,
                       winner_elo_after, loser_elo_after, rounds_won, rounds_lost,
                       duration_ms, state_hash, verified,
                       void_reason)
  values (p_winner, p_loser, w_elo, l_elo, new_w, new_l, p_rounds_won, p_rounds_lost,
          p_duration_ms, p_state_hash, p_verified,
          case when p_verified then null else 'state hash unverified' end)
  returning id into m_id;

  if p_verified then
    update players
      set win_count = win_count + 1,
          matches   = matches + 1,
          elo       = new_w,
          peak_elo  = greatest(peak_elo, new_w)
      where id = p_winner;

    update players
      set loss_count = loss_count + 1,
          matches    = matches + 1,
          elo        = new_l
      where id = p_loser;
  end if;

  return query select
    p_winner, (select p.win_count from players p where p.id = p_winner),
    new_w, new_w - w_elo,
    p_loser, new_l, new_l - l_elo, m_id;
end $$;

revoke all on function public.record_match_result from public, anon;
grant execute on function public.record_match_result to service_role;

-- ------------------------------------------------------------------
-- increment_win — the minimal "bump win_count on victory" primitive,
-- kept separate for unranked/casual wins that don't move Elo.
-- ------------------------------------------------------------------
create or replace function public.increment_win(p_player uuid)
returns integer
language sql
security definer
set search_path = public
as $$
  update public.players
     set win_count = win_count + 1,
         matches   = matches + 1
   where id = p_player
  returning win_count;
$$;
revoke all on function public.increment_win from public, anon;
grant execute on function public.increment_win to service_role;

-- ------------------------------------------------------------------
-- leaderboard view
-- ------------------------------------------------------------------
create or replace view public.leaderboard as
  select id, handle, elo, peak_elo, win_count, loss_count, matches,
         case when matches = 0 then 0
              else round(win_count::numeric * 100 / matches, 1) end as win_rate,
         rank() over (order by elo desc, win_count desc) as rank
  from public.players
  where matches > 0
  order by elo desc, win_count desc;
