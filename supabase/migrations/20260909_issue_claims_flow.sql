-- Issue claiming.
--
-- A claim is a team taking an issue so no one else works on it. One active
-- claim per issue — claims aren't released in the MVP, they end when the issue
-- is solved. `app/lib/services/claim.service.ts` re-checks everything on the
-- server; the constraints and policies here are the backstop.
--
-- Safe to run more than once.

begin;

alter table public.issue_claims
  add column if not exists team_id uuid references public.teams(id) on delete cascade;

alter table public.issue_claims
  add column if not exists claimed_by uuid references public.profiles(id) on delete set null;

alter table public.issue_claims
  add column if not exists created_at timestamptz not null default now();

-- One claim per issue -> races collapse to a single winner.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'issue_claims_issue_key'
  ) then
    alter table public.issue_claims
      add constraint issue_claims_issue_key unique (issue_id);
  end if;
end $$;

create index if not exists issue_claims_team_idx on public.issue_claims (team_id);

-- ---------------------------------------------------------------------------
-- RLS: anyone signed in can see which issues are taken (not sensitive). A
-- participant may create a claim only for a team they belong to and only in
-- their own name. No update/delete — claims are permanent until the issue is
-- solved.
-- ---------------------------------------------------------------------------
alter table public.issue_claims enable row level security;

-- Drop-and-recreate (not "if not exists"): a stale or differently-defined
-- policy of the same name would otherwise be left in place and keep the claim
-- rows unreadable.
drop policy if exists "issue_claims_public_read" on public.issue_claims;
create policy "issue_claims_public_read" on public.issue_claims
  for select using (true);

drop policy if exists "issue_claims_insert_own_team" on public.issue_claims;
create policy "issue_claims_insert_own_team" on public.issue_claims
  for insert to authenticated
  with check (
    claimed_by = auth.uid()
    and public.is_team_member(team_id, auth.uid())
  );

commit;
