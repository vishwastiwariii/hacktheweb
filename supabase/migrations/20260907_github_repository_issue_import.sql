-- GitHub Repository & Issue Auto-Import
-- Repos and issues are imported from GitHub. GitHub owns the content
-- (title/description/labels/points/difficulty); the platform owns `available`
-- and everything downstream (claims, contributions, scoring).
--
-- Safe to run more than once.

begin;

-- ---------------------------------------------------------------------------
-- repositories: GitHub-owned metadata
-- ---------------------------------------------------------------------------
alter table public.repositories
  add column if not exists html_url text;

alter table public.repositories
  add column if not exists updated_at timestamptz not null default now();

-- Derived, never written directly.
alter table public.repositories
  add column if not exists full_name text
  generated always as (owner || '/' || name) stored;

-- One GitHub repo per event -> lets import upsert on conflict.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'repositories_event_github_repo_key'
  ) then
    alter table public.repositories
      add constraint repositories_event_github_repo_key
      unique (event_id, github_repo_id);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- hackathon_issues: GitHub-owned content + platform-owned availability
-- ---------------------------------------------------------------------------
alter table public.hackathon_issues
  add column if not exists github_issue_id bigint;

alter table public.hackathon_issues
  add column if not exists html_url text;

alter table public.hackathon_issues
  add column if not exists difficulty text
  check (difficulty is null or difficulty in ('easy', 'medium', 'hard'));

alter table public.hackathon_issues
  add column if not exists labels jsonb not null default '[]'::jsonb;

-- Platform-owned: whether the issue takes part in the hackathon.
alter table public.hackathon_issues
  add column if not exists available boolean not null default true;

-- Derived on import: has exactly one points:* and one difficulty:* label.
alter table public.hackathon_issues
  add column if not exists metadata_valid boolean not null default false;

alter table public.hackathon_issues
  add column if not exists metadata_error text;

alter table public.hackathon_issues
  add column if not exists github_created_at timestamptz;

alter table public.hackathon_issues
  add column if not exists github_updated_at timestamptz;

alter table public.hackathon_issues
  add column if not exists updated_at timestamptz not null default now();

-- points already exists; make sure re-import can always write a value.
alter table public.hackathon_issues
  alter column points set default 0;

-- One row per GitHub issue per repo -> lets import upsert on conflict.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'hackathon_issues_repo_github_issue_key'
  ) then
    alter table public.hackathon_issues
      add constraint hackathon_issues_repo_github_issue_key
      unique (repository_id, github_issue_id);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- RLS: public can read repos + issues; only admins can write them.
-- (Adds policies if missing; existing read policies are left untouched.)
-- ---------------------------------------------------------------------------
alter table public.repositories     enable row level security;
alter table public.hackathon_issues enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'repositories' and policyname = 'repositories_public_read') then
    create policy "repositories_public_read" on public.repositories for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'repositories' and policyname = 'repositories_admin_write') then
    create policy "repositories_admin_write" on public.repositories for all to authenticated
      using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin))
      with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));
  end if;
  if not exists (select 1 from pg_policies where tablename = 'hackathon_issues' and policyname = 'hackathon_issues_public_read') then
    create policy "hackathon_issues_public_read" on public.hackathon_issues for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'hackathon_issues' and policyname = 'hackathon_issues_admin_write') then
    create policy "hackathon_issues_admin_write" on public.hackathon_issues for all to authenticated
      using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin))
      with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));
  end if;
end $$;

commit;
