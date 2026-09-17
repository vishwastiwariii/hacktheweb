-- Contributions + webhook processing.
--
-- Division of labour between REST and webhooks:
--   * Repositories and issues are imported through the REST admin flow
--     (POST /api/admin/repositories/import) and refreshed by re-import. Webhooks
--     do NOT touch repositories or hackathon_issues.
--   * The GitHub webhook (POST /api/github/webhook) is the ONLY writer of
--     `contributions`. It tracks pull requests:
--
--       pull_request event -> verify signature -> store raw delivery
--                          -> return 200 -> resolve author + team + issue
--                          -> upsert contribution
--
-- Contribution state machine (webhook-owned prefix, then admin):
--   OPEN -> MERGED -> PENDING_REVIEW -> APPROVED | REJECTED
--   plus UNMATCHED           (PR author is not a registered participant)
--   and  NEEDS_ISSUE_MAPPING (no "Fixes #n" reference resolved to an issue)
--
-- Safe to run more than once.

begin;

-- ---------------------------------------------------------------------------
-- webhook_events: raw deliveries + processing outcome.
-- `delivery_id` uniqueness IS the idempotency mechanism: insert first, skip
-- processing on conflict. Only the service-role client touches this table.
-- ---------------------------------------------------------------------------
create table if not exists public.webhook_events (
  id                   uuid primary key default gen_random_uuid(),
  delivery_id          text not null,
  event_type           text not null,
  action               text,
  repository_full_name text,
  payload              jsonb not null,
  processed_at         timestamptz,
  process_error        text,
  created_at           timestamptz not null default now()
);

-- Column adds for a pre-existing table.
alter table public.webhook_events add column if not exists action text;
alter table public.webhook_events add column if not exists repository_full_name text;
alter table public.webhook_events add column if not exists processed_at timestamptz;
alter table public.webhook_events add column if not exists process_error text;
alter table public.webhook_events add column if not exists created_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'webhook_events_delivery_id_key'
  ) then
    alter table public.webhook_events
      add constraint webhook_events_delivery_id_key unique (delivery_id);
  end if;
end $$;

-- No policies on purpose: raw webhook payloads are server-only. The webhook
-- route uses the service-role client, which bypasses RLS.
alter table public.webhook_events enable row level security;

-- ---------------------------------------------------------------------------
-- contributions: one row per tracked pull request.
-- ---------------------------------------------------------------------------
create table if not exists public.contributions (
  id               uuid primary key default gen_random_uuid(),

  event_id         uuid not null references public.events(id) on delete cascade,
  repository_id    uuid references public.repositories(id) on delete set null,
  issue_id         uuid references public.hackathon_issues(id) on delete set null,
  team_id          uuid references public.teams(id) on delete set null,
  profile_id       uuid references public.profiles(id) on delete set null,

  github_pr_id     bigint  not null,
  github_pr_number integer not null,
  repo_full_name   text    not null,
  pr_author_login  text    not null,
  pr_title         text,
  pr_url           text,
  issue_number     integer,

  status           text not null default 'OPEN'
    check (status in (
      'OPEN', 'MERGED', 'PENDING_REVIEW', 'APPROVED', 'REJECTED',
      'UNMATCHED', 'NEEDS_ISSUE_MAPPING'
    )),
  merged           boolean not null default false,
  merged_at        timestamptz,

  -- Scoring guard. Set true only inside the approval transaction; never reset
  -- by a webhook.
  points_awarded   boolean not null default false,

  reviewed_by      uuid references public.profiles(id) on delete set null,
  reviewed_at      timestamptz,
  review_note      text,

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Column adds for a pre-existing table.
alter table public.contributions add column if not exists repository_id uuid references public.repositories(id) on delete set null;
alter table public.contributions add column if not exists issue_id uuid references public.hackathon_issues(id) on delete set null;
alter table public.contributions add column if not exists team_id uuid references public.teams(id) on delete set null;
alter table public.contributions add column if not exists profile_id uuid references public.profiles(id) on delete set null;
alter table public.contributions add column if not exists github_pr_id bigint;
alter table public.contributions add column if not exists github_pr_number integer;
alter table public.contributions add column if not exists repo_full_name text;
alter table public.contributions add column if not exists pr_author_login text;
alter table public.contributions add column if not exists pr_title text;
alter table public.contributions add column if not exists pr_url text;
alter table public.contributions add column if not exists issue_number integer;
alter table public.contributions add column if not exists merged boolean not null default false;
alter table public.contributions add column if not exists merged_at timestamptz;
alter table public.contributions add column if not exists points_awarded boolean not null default false;
alter table public.contributions add column if not exists reviewed_by uuid references public.profiles(id) on delete set null;
alter table public.contributions add column if not exists reviewed_at timestamptz;
alter table public.contributions add column if not exists review_note text;
alter table public.contributions add column if not exists updated_at timestamptz not null default now();

-- One contribution per PR per event -> lets the webhook upsert across a PR's
-- opened / synchronize / closed lifecycle and across GitHub redeliveries.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'contributions_event_pr_key'
  ) then
    alter table public.contributions
      add constraint contributions_event_pr_key unique (event_id, github_pr_id);
  end if;
end $$;

create index if not exists contributions_event_status_idx on public.contributions (event_id, status);
create index if not exists contributions_team_idx          on public.contributions (team_id);
create index if not exists contributions_issue_idx         on public.contributions (issue_id);

-- ---------------------------------------------------------------------------
-- RLS: a participant reads their own team's contributions; admins do anything.
-- The webhook writes via the service-role client, which bypasses RLS.
-- (is_team_member() is the SECURITY DEFINER helper from
--  20260908_team_visibility_and_uniqueness.sql.)
-- ---------------------------------------------------------------------------
alter table public.contributions enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'contributions' and policyname = 'contributions_team_read'
  ) then
    create policy "contributions_team_read" on public.contributions
      for select to authenticated
      using (team_id is not null and public.is_team_member(team_id, auth.uid()));
  end if;

  if not exists (
    select 1 from pg_policies
    where tablename = 'contributions' and policyname = 'contributions_admin_all'
  ) then
    create policy "contributions_admin_all" on public.contributions
      for all to authenticated
      using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin))
      with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));
  end if;
end $$;

commit;
