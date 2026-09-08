-- Team registration: RLS INSERT policies + helper functions.
--
-- Problem it fixes:
--   * teams / team_members had RLS on with no INSERT policy, so creating or
--     joining a team failed with:
--       "new row violates row-level security policy for table \"teams\""
--   * The join flow looks up a team by its join code and counts its seats
--     before inserting the membership row. A non-member can't do either read
--     under a members-only SELECT policy, and a blanket public read on `teams`
--     would expose every team's join_code. The two SECURITY DEFINER helpers
--     below scope those reads to exactly what the join flow needs.
--
-- Writes elsewhere (teams.score, etc.) stay server-side / admin. Safe to run
-- more than once.

begin;

alter table public.teams        enable row level security;
alter table public.team_members enable row level security;

do $$
begin
  -- A signed-in user can create a team, but only while the event's
  -- registration window is open.
  if not exists (
    select 1 from pg_policies
    where tablename = 'teams' and policyname = 'teams_insert_open_event'
  ) then
    create policy "teams_insert_open_event" on public.teams
      for insert to authenticated
      with check (
        exists (
          select 1 from public.events e
          where e.id = event_id and e.registration_open
        )
      );
  end if;

  -- A signed-in user can add only themselves to a team (as leader on create,
  -- as member on join). Seat limit + one-team-per-event are enforced by the
  -- service and by table constraints.
  if not exists (
    select 1 from pg_policies
    where tablename = 'team_members' and policyname = 'team_members_insert_self'
  ) then
    create policy "team_members_insert_self" on public.team_members
      for insert to authenticated
      with check (user_id = auth.uid());
  end if;
end $$;

-- Resolve a team from its join code (a bearer token). Returns the row without
-- opening up a table-wide read of teams / their codes.
create or replace function public.team_by_join_code(
  p_event_id uuid,
  p_join_code text
)
returns setof public.teams
language sql
stable
security definer
set search_path = public
as $$
  select *
  from public.teams
  where event_id = p_event_id
    and join_code = upper(btrim(p_join_code))
  limit 1;
$$;

-- Current seat count for a team the caller may not belong to yet.
create or replace function public.team_seat_count(p_team_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int
  from public.team_members
  where team_id = p_team_id;
$$;

revoke all on function public.team_by_join_code(uuid, text) from public, anon;
revoke all on function public.team_seat_count(uuid)         from public, anon;
grant execute on function public.team_by_join_code(uuid, text) to authenticated;
grant execute on function public.team_seat_count(uuid)         to authenticated;

commit;
