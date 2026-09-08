-- Contribution review: approve / reject, and the points ledger.
--
-- Approving is ONE transaction (a plpgsql function is one): write the ledger
-- row, bump the cached team score, mark the contribution APPROVED +
-- points_awarded. Any failure rolls the whole thing back. The point value comes
-- from hackathon_issues.points (the GitHub label) — never from the client.
--
-- Rejecting writes no ledger row and awards nothing; it also recomputes the
-- issue's solved flag, since a rejected PR no longer resolves it.
--
-- Safe to run more than once.

begin;

-- ---------------------------------------------------------------------------
-- point_transactions: the ledger. Every score change is a row here.
-- ---------------------------------------------------------------------------
create table if not exists public.point_transactions (
  id              uuid primary key default gen_random_uuid(),
  event_id        uuid references public.events(id) on delete cascade,
  team_id         uuid not null references public.teams(id) on delete cascade,
  contribution_id uuid references public.contributions(id) on delete set null,
  amount          integer not null,
  reason          text,
  kind            text not null default 'AWARD',
  created_by      uuid references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now()
);

alter table public.point_transactions add column if not exists event_id uuid references public.events(id) on delete cascade;
alter table public.point_transactions add column if not exists contribution_id uuid references public.contributions(id) on delete set null;
alter table public.point_transactions add column if not exists reason text;
alter table public.point_transactions add column if not exists kind text not null default 'AWARD';
alter table public.point_transactions add column if not exists created_by uuid references public.profiles(id) on delete set null;
alter table public.point_transactions add column if not exists created_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'point_transactions_kind_check'
  ) then
    alter table public.point_transactions
      add constraint point_transactions_kind_check
      check (kind in ('AWARD', 'ADJUSTMENT'));
  end if;
end $$;

-- One AWARD row per contribution — a redelivered approve can't double-score.
create unique index if not exists point_transactions_award_per_contribution
  on public.point_transactions (contribution_id)
  where kind = 'AWARD' and contribution_id is not null;

create index if not exists point_transactions_team_idx on public.point_transactions (team_id);

-- ---------------------------------------------------------------------------
-- RLS: a participant reads their own team's ledger; admins read everything.
-- Writes happen only inside the SECURITY DEFINER functions below.
-- ---------------------------------------------------------------------------
alter table public.point_transactions enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'point_transactions' and policyname = 'point_transactions_team_read') then
    create policy "point_transactions_team_read" on public.point_transactions
      for select to authenticated
      using (public.is_team_member(team_id, auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where tablename = 'point_transactions' and policyname = 'point_transactions_admin_read') then
    create policy "point_transactions_admin_read" on public.point_transactions
      for select to authenticated
      using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));
  end if;
end $$;

-- Admins need to read team rows they aren't a member of, for the review queue.
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'teams' and policyname = 'teams_admin_read') then
    create policy "teams_admin_read" on public.teams
      for select to authenticated
      using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- approve_contribution(): the one-transaction award.
-- ---------------------------------------------------------------------------
create or replace function public.approve_contribution(p_contribution_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reviewer uuid := auth.uid();
  c          public.contributions%rowtype;
  v_issue    public.hackathon_issues%rowtype;
  v_points   integer;
begin
  if v_reviewer is null then
    raise exception 'not authenticated' using errcode = 'insufficient_privilege';
  end if;
  if not exists (select 1 from public.profiles where id = v_reviewer and is_admin) then
    raise exception 'not authorized' using errcode = 'insufficient_privilege';
  end if;

  select * into c from public.contributions where id = p_contribution_id for update;
  if not found then
    raise exception 'contribution not found' using errcode = 'no_data_found';
  end if;

  -- Re-check everything server-side; never trust that the queue was fresh.
  if c.points_awarded or c.status = 'APPROVED' then
    raise exception 'contribution is already approved' using errcode = 'raise_exception';
  end if;
  if not c.merged then
    raise exception 'pull request is not merged' using errcode = 'raise_exception';
  end if;
  if c.team_id is null then
    raise exception 'contribution has no team (resolve UNMATCHED first)' using errcode = 'raise_exception';
  end if;
  if c.issue_id is null then
    raise exception 'contribution is not mapped to an issue (resolve NEEDS_ISSUE_MAPPING first)' using errcode = 'raise_exception';
  end if;

  select * into v_issue from public.hackathon_issues where id = c.issue_id;
  if not found then
    raise exception 'issue not found' using errcode = 'raise_exception';
  end if;
  if not v_issue.available or not v_issue.metadata_valid then
    raise exception 'issue is not available or has invalid label metadata' using errcode = 'raise_exception';
  end if;

  -- Point value is the GitHub label, full stop.
  v_points := coalesce(v_issue.points, 0);

  -- 1. ledger
  insert into public.point_transactions
    (event_id, team_id, contribution_id, amount, reason, kind, created_by)
  values
    (c.event_id, c.team_id, c.id, v_points,
     'PR #' || c.github_pr_number || ' — ' || coalesce(v_issue.title, 'issue'),
     'AWARD', v_reviewer);

  -- 2. cached score
  update public.teams
     set score = coalesce(score, 0) + v_points
   where id = c.team_id;

  -- 3. contribution
  update public.contributions
     set status = 'APPROVED',
         points_awarded = true,
         reviewed_by = v_reviewer,
         reviewed_at = now(),
         updated_at = now()
   where id = c.id;

  -- 4. the issue stays solved
  update public.hackathon_issues
     set solved = true,
         solved_at = coalesce(solved_at, now())
   where id = c.issue_id;

  return jsonb_build_object(
    'contribution_id', c.id,
    'team_id', c.team_id,
    'points_awarded', v_points
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- reject_contribution(): no ledger row, no points; recompute solved.
-- ---------------------------------------------------------------------------
create or replace function public.reject_contribution(
  p_contribution_id uuid,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reviewer uuid := auth.uid();
  c          public.contributions%rowtype;
  v_solved   boolean;
begin
  if v_reviewer is null then
    raise exception 'not authenticated' using errcode = 'insufficient_privilege';
  end if;
  if not exists (select 1 from public.profiles where id = v_reviewer and is_admin) then
    raise exception 'not authorized' using errcode = 'insufficient_privilege';
  end if;

  select * into c from public.contributions where id = p_contribution_id for update;
  if not found then
    raise exception 'contribution not found' using errcode = 'no_data_found';
  end if;
  if c.points_awarded then
    raise exception 'points were already awarded — reverse them with an adjustment instead' using errcode = 'raise_exception';
  end if;

  update public.contributions
     set status = 'REJECTED',
         reviewed_by = v_reviewer,
         reviewed_at = now(),
         review_note = nullif(btrim(coalesce(p_note, '')), ''),
         updated_at = now()
   where id = c.id;

  -- A rejected PR no longer resolves its issue.
  if c.issue_id is not null then
    select exists (
      select 1 from public.contributions x
      where x.issue_id = c.issue_id and x.merged and x.status <> 'REJECTED'
    ) into v_solved;

    update public.hackathon_issues
       set solved = v_solved,
           solved_at = case when v_solved then coalesce(solved_at, now()) else null end
     where id = c.issue_id;
  end if;

  return jsonb_build_object('contribution_id', c.id, 'status', 'REJECTED');
end;
$$;

revoke all on function public.approve_contribution(uuid) from public, anon;
revoke all on function public.reject_contribution(uuid, text) from public, anon;
grant execute on function public.approve_contribution(uuid) to authenticated;
grant execute on function public.reject_contribution(uuid, text) to authenticated;

commit;
