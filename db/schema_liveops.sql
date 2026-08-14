-- ============================================================
-- NEON FIST — live-ops schema (Phases 15-20)
-- Applies on top of db/schema.sql
-- ============================================================

-- ------------------------------------------------------------------
-- PHASE 15: telemetry
--
-- Design note: raw events are high-volume and cheap to write, but
-- expensive to query and expensive to STORE (Phase 19). So raw events go
-- into a partition-friendly table with a short retention, and everything
-- the balance team actually reads comes from rollup tables that are
-- aggregated on write. We never run analytics over raw rows in prod.
-- ------------------------------------------------------------------

create table if not exists public.telemetry_events (
  id           bigserial primary key,
  player_id    uuid references public.players(id) on delete set null,
  session_id   text not null,
  event        text not null,
  -- funnel step ordering for drop-off analysis
  funnel_step  smallint,
  payload      jsonb not null default '{}'::jsonb,
  app_version  text,
  config_version text,
  platform     text,
  created_at   timestamptz not null default now()
);
create index if not exists tel_event_time_idx on public.telemetry_events (event, created_at desc);
create index if not exists tel_player_idx on public.telemetry_events (player_id, created_at desc);
create index if not exists tel_session_idx on public.telemetry_events (session_id);

-- Per-move usage rollup: "which attacks are being spammed"
create table if not exists public.move_stats (
  day            date not null,
  character_id   text not null,
  move_key       text not null,
  config_version text not null default 'base',
  uses           bigint not null default 0,
  hits           bigint not null default 0,
  blocked        bigint not null default 0,
  whiffs         bigint not null default 0,
  damage_dealt   bigint not null default 0,
  ko_blows       bigint not null default 0,
  primary key (day, character_id, move_key, config_version)
);

-- Per-character win/loss rollup
create table if not exists public.character_stats (
  day            date not null,
  character_id   text not null,
  config_version text not null default 'base',
  wins           bigint not null default 0,
  losses         bigint not null default 0,
  mirrors        bigint not null default 0,
  rounds_won     bigint not null default 0,
  rounds_lost    bigint not null default 0,
  total_match_ms bigint not null default 0,
  match_count    bigint not null default 0,
  primary key (day, character_id, config_version)
);

-- Retention: one row per player per day-of-life
create table if not exists public.retention_cohorts (
  cohort_date  date not null,
  day_offset   smallint not null,     -- 0,1,7,30...
  players      bigint not null default 0,
  primary key (cohort_date, day_offset)
);

create table if not exists public.player_activity (
  player_id   uuid not null references public.players(id) on delete cascade,
  day         date not null,
  matches     integer not null default 0,
  primary key (player_id, day)
);

-- Funnel drop-off
create table if not exists public.funnel_stats (
  day        date not null,
  step       smallint not null,
  step_name  text not null,
  entered    bigint not null default 0,
  exited     bigint not null default 0,   -- quit AT this step
  primary key (day, step)
);

alter table public.telemetry_events enable row level security;
alter table public.move_stats enable row level security;
alter table public.character_stats enable row level security;
alter table public.funnel_stats enable row level security;
alter table public.player_activity enable row level security;

-- Clients may INSERT their own events but never read the firehose.
drop policy if exists tel_insert_self on public.telemetry_events;
create policy tel_insert_self on public.telemetry_events
  for insert with check (player_id is null or auth.uid() = player_id);

-- Aggregates are public reads (the balance dashboard is public).
drop policy if exists move_stats_read on public.move_stats;
create policy move_stats_read on public.move_stats for select using (true);
drop policy if exists char_stats_read on public.character_stats;
create policy char_stats_read on public.character_stats for select using (true);

-- ------------------------------------------------------------------
-- PHASE 16: OTA config, A/B testing, kill switch
-- ------------------------------------------------------------------
create table if not exists public.config_versions (
  version      text primary key,
  channel      text not null default 'stable'
                 check (channel in ('stable','beta','experiment','rollback')),
  payload      jsonb not null,               -- the fighter/rules JSON
  fingerprint  text not null,
  parent       text references public.config_versions(version),
  notes        text,
  published    boolean not null default false,
  created_at   timestamptz not null default now()
);

-- exactly one live config per channel
create table if not exists public.config_channels (
  channel     text primary key,
  version     text not null references public.config_versions(version),
  -- % of players who receive this channel (0-100); stable gets the rest
  rollout_pct smallint not null default 100 check (rollout_pct between 0 and 100),
  killed      boolean not null default false,
  updated_at  timestamptz not null default now()
);

create table if not exists public.experiments (
  id          text primary key,
  description text,
  variants    jsonb not null,      -- [{id:"control",pct:50},{id:"treat",pct:50}]
  metric      text,                -- primary metric to judge
  active      boolean not null default false,
  created_at  timestamptz not null default now(),
  ended_at    timestamptz
);

create table if not exists public.experiment_exposure (
  experiment_id text not null references public.experiments(id) on delete cascade,
  player_id     uuid not null references public.players(id) on delete cascade,
  variant       text not null,
  assigned_at   timestamptz not null default now(),
  primary key (experiment_id, player_id)
);

alter table public.config_versions enable row level security;
alter table public.config_channels enable row level security;
drop policy if exists cfg_read on public.config_versions;
create policy cfg_read on public.config_versions for select using (published);
drop policy if exists chan_read on public.config_channels;
create policy chan_read on public.config_channels for select using (true);

-- ------------------------------------------------------------------
-- PHASE 17: content cadence
-- ------------------------------------------------------------------
create table if not exists public.content_releases (
  id           text primary key,
  kind         text not null check (kind in ('fighter','stage','event','cosmetic')),
  title        text not null,
  payload      jsonb not null default '{}'::jsonb,
  publish_at   timestamptz not null,
  unpublish_at timestamptz,
  published    boolean not null default false,
  created_at   timestamptz not null default now()
);
create index if not exists content_publish_idx on public.content_releases (publish_at)
  where not published;

alter table public.content_releases enable row level security;
drop policy if exists content_read on public.content_releases;
create policy content_read on public.content_releases
  for select using (published and publish_at <= now()
                    and (unpublish_at is null or unpublish_at > now()));

-- ------------------------------------------------------------------
-- PHASE 18: moderation & tournaments
-- ------------------------------------------------------------------
create table if not exists public.player_reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.players(id) on delete set null,
  target_id   uuid not null references public.players(id) on delete cascade,
  match_id    uuid references public.matches(id) on delete set null,
  reason      text not null check (reason in ('lag_switch','harassment','cheating','other')),
  detail      text,
  created_at  timestamptz not null default now()
);
create index if not exists reports_target_idx on public.player_reports (target_id, created_at desc);

create table if not exists public.enforcement (
  id          uuid primary key default gen_random_uuid(),
  player_id   uuid not null references public.players(id) on delete cascade,
  action      text not null check (action in ('warn','shadow_queue','suspend','ban')),
  reason      text not null,
  evidence    jsonb not null default '{}'::jsonb,
  issued_at   timestamptz not null default now(),
  expires_at  timestamptz,
  automated   boolean not null default true,
  revoked     boolean not null default false
);
create index if not exists enf_player_idx on public.enforcement (player_id, expires_at);

-- Behavioural signals used by the automated detector
create table if not exists public.connection_stats (
  player_id     uuid not null references public.players(id) on delete cascade,
  match_id      uuid references public.matches(id) on delete set null,
  rollback_rate real,        -- avg rollbacks/sec observed by the OPPONENT
  desync_count  integer default 0,
  stall_events  integer default 0,   -- input starvation while winning
  disconnect_at_losing boolean default false,
  created_at    timestamptz not null default now()
);
create index if not exists connstat_player_idx on public.connection_stats (player_id, created_at desc);

create table if not exists public.tournaments (
  id          text primary key,
  name        text not null,
  format      text not null default 'single_elim'
                check (format in ('single_elim','double_elim','round_robin')),
  state       text not null default 'registration'
                check (state in ('registration','running','complete','cancelled')),
  max_players integer not null default 32,
  starts_at   timestamptz,
  created_at  timestamptz not null default now()
);

create table if not exists public.tournament_entrants (
  tournament_id text not null references public.tournaments(id) on delete cascade,
  player_id     uuid not null references public.players(id) on delete cascade,
  seed          integer,
  eliminated    boolean not null default false,
  primary key (tournament_id, player_id)
);

create table if not exists public.tournament_matches (
  id            uuid primary key default gen_random_uuid(),
  tournament_id text not null references public.tournaments(id) on delete cascade,
  round         integer not null,
  slot          integer not null,
  player_a      uuid references public.players(id),
  player_b      uuid references public.players(id),
  winner_id     uuid references public.players(id),
  match_id      uuid references public.matches(id),
  spectator_key text,
  state         text not null default 'pending'
                  check (state in ('pending','live','complete','bye')),
  unique (tournament_id, round, slot)
);

-- ------------------------------------------------------------------
-- PHASE 19: economy (cosmetics only — never stat-affecting)
-- ------------------------------------------------------------------
create table if not exists public.store_items (
  sku         text primary key,
  kind        text not null check (kind in ('skin','palette','hitspark','announcer','title')),
  title       text not null,
  price_cents integer not null check (price_cents >= 0),
  currency    text not null default 'USD',
  -- HARD CONSTRAINT: cosmetics may never carry gameplay values.
  -- Enforced in SQL so no future migration can quietly add pay-to-win.
  payload     jsonb not null default '{}'::jsonb,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  constraint cosmetic_only check (
    not (payload ?| array['damage','startup','active','recovery','hitstun',
                          'blockstun','box','physics','hp','meter','scaling'])
  )
);

create table if not exists public.entitlements (
  player_id  uuid not null references public.players(id) on delete cascade,
  sku        text not null references public.store_items(sku),
  source     text not null default 'purchase'
               check (source in ('purchase','grant','reward','refund_pending')),
  acquired_at timestamptz not null default now(),
  primary key (player_id, sku)
);

create table if not exists public.purchases (
  id            uuid primary key default gen_random_uuid(),
  player_id     uuid not null references public.players(id) on delete cascade,
  sku           text not null references public.store_items(sku),
  amount_cents  integer not null,
  currency      text not null default 'USD',
  provider      text not null default 'stripe',
  provider_ref  text unique,          -- idempotency key from the PSP
  state         text not null default 'pending'
                  check (state in ('pending','paid','failed','refunded')),
  created_at    timestamptz not null default now()
);

alter table public.store_items enable row level security;
alter table public.entitlements enable row level security;
drop policy if exists store_read on public.store_items;
create policy store_read on public.store_items for select using (active);
drop policy if exists ent_read_self on public.entitlements;
create policy ent_read_self on public.entitlements
  for select using (auth.uid() = player_id);

-- Grant an entitlement exactly once, even if the PSP webhook retries.
create or replace function public.fulfill_purchase(
  p_player uuid, p_sku text, p_amount integer, p_provider_ref text
) returns text
language plpgsql security definer set search_path = public as $$
declare existing text;
begin
  select id::text into existing from purchases where provider_ref = p_provider_ref;
  if existing is not null then
    return 'duplicate';                    -- idempotent: webhook replay
  end if;
  insert into purchases (player_id, sku, amount_cents, provider_ref, state)
    values (p_player, p_sku, p_amount, p_provider_ref, 'paid');
  insert into entitlements (player_id, sku, source)
    values (p_player, p_sku, 'purchase')
    on conflict (player_id, sku) do nothing;
  return 'fulfilled';
end $$;
revoke all on function public.fulfill_purchase from public, anon;
grant execute on function public.fulfill_purchase to service_role;

-- ------------------------------------------------------------------
-- PHASE 19: cost control. Raw telemetry is the thing that will blow the
-- free tier, so retention is a first-class scheduled operation.
-- ------------------------------------------------------------------
create or replace function public.prune_telemetry(p_days integer default 30)
returns bigint language plpgsql security definer set search_path = public as $$
declare n bigint;
begin
  delete from telemetry_events where created_at < now() - (p_days || ' days')::interval;
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.prune_telemetry from public, anon;
grant execute on function public.prune_telemetry to service_role;

-- ------------------------------------------------------------------
-- PHASE 20: sunset
-- ------------------------------------------------------------------
create table if not exists public.service_status (
  id            boolean primary key default true check (id),   -- single row
  mode          text not null default 'live'
                  check (mode in ('live','degraded','p2p_only','readonly','sunset')),
  message       text,
  matchmaking   boolean not null default true,
  ranked        boolean not null default true,
  store         boolean not null default true,
  telemetry     boolean not null default true,
  final_build_url text,
  sunset_at     timestamptz,
  updated_at    timestamptz not null default now()
);
insert into public.service_status (id) values (true) on conflict do nothing;

alter table public.service_status enable row level security;
drop policy if exists status_read on public.service_status;
create policy status_read on public.service_status for select using (true);

-- Data export so players can keep their record after shutdown.
create or replace function public.export_player_data(p_player uuid)
returns jsonb language sql security definer set search_path = public as $$
  select jsonb_build_object(
    'player', (select to_jsonb(p) from players p where p.id = p_player),
    'matches', (select coalesce(jsonb_agg(to_jsonb(m)), '[]'::jsonb)
                  from matches m where m.winner_id = p_player or m.loser_id = p_player),
    'entitlements', (select coalesce(jsonb_agg(to_jsonb(e)), '[]'::jsonb)
                  from entitlements e where e.player_id = p_player),
    'exported_at', now()
  );
$$;
