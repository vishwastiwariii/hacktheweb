-- Team visibility (SELECT policies) + one-team-per-user constraint.
--
-- Problem it fixes:
--   * teams / team_members had RLS enabled with no SELECT policy, so after a
--     successful create/join getUserTeam() read back nothing: the dashboard
--     kept showing "create a team" and /dashboard/team redirected away.
--   * "A participant belongs to at most one team" was only enforced in the
--     service, not the database.
--
-- The membership check goes through a SECURITY DEFINER helper so a policy on
-- team_members can reference team_members without tripping RLS recursion.
--
-- Safe to run more than once.

begin;

alter table public.teams        enable row level security;
alter table public.team_members enable row level security;

create or replace function public.is_team_member(p_team_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.team_members
    where team_id = p_team_id and user_id = p_user_id
  );
$$;

revoke all on function public.is_team_member(uuid, uuid) from public, anon;
grant execute on function public.is_team_member(uuid, uuid) to authenticated;

-- Leaderboard position for one team (1 + number of teams in the same event with
-- a strictly higher score). SECURITY DEFINER so a participant who can only see
-- their own team can still learn its rank, without a table-wide read.
create or replace function public.team_rank(p_team_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select 1 + count(*)::int
  from public.teams t
  where t.event_id = (select event_id from public.teams where id = p_team_id)
    and t.score > (select score from public.teams where id = p_team_id);
$$;

revoke all on function public.team_rank(uuid) from public, anon;
grant execute on function public.team_rank(uuid) to authenticated;

do $$
begin
  -- A participant can read every team they belong to.
  if not exists (
    select 1 from pg_policies
    where tablename = 'teams' and policyname = 'teams_member_read'
  ) then
    create policy "teams_member_read" on public.teams
      for select to authenticated
      using (public.is_team_member(id, auth.uid()));
  end if;

  -- A participant can read the member rows of any team they belong to
  -- (so the team page can list teammates and count seats).
  if not exists (
    select 1 from pg_policies
    where tablename = 'team_members' and policyname = 'team_members_same_team_read'
  ) then
    create policy "team_members_same_team_read" on public.team_members
      for select to authenticated
      using (public.is_team_member(team_id, auth.uid()));
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- One membership per user.
-- Before the SELECT policies above existed, getUserTeam() read back nothing, so
-- the "already on a team" guard never fired and repeat create attempts left
-- duplicate team_members rows. Collapse them (keep the newest per user), drop
-- the teams that are left with no members, then add the constraint.
--
-- Global unique on user_id == one team per event here (single active event). If
-- multi-event support lands, add team_members.event_id and switch to
-- unique (user_id, event_id).
-- ---------------------------------------------------------------------------
delete from public.team_members
where id in (
  select id from (
    select id, row_number() over (
      partition by user_id order by created_at desc, id desc
    ) as rn
    from public.team_members
  ) ranked
  where rn > 1
);

delete from public.teams t
where not exists (
  select 1 from public.team_members tm where tm.team_id = t.id
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'team_members_user_key'
  ) then
    alter table public.team_members
      add constraint team_members_user_key unique (user_id);
  end if;
end $$;

commit;
