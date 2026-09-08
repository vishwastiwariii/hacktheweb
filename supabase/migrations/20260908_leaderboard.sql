-- Leaderboard read.
--
-- The public leaderboard needs every team in the event ranked by score, plus a
-- member count, the team's most recent scored delivery, and any point gain in
-- the last few minutes (the "+80 just now" chip). A participant can only read
-- their own team under RLS, and `teams` also carries `join_code`, so this is a
-- SECURITY DEFINER function that returns only the safe columns.
--
-- Safe to run more than once.

begin;

create or replace function public.get_leaderboard(p_event_id uuid)
returns table (
  team_id uuid,
  name text,
  score integer,
  member_count integer,
  last_delivery_repo text,
  last_delivery_issue integer,
  recent_delta integer,
  recent_delta_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    t.id,
    t.name,
    coalesce(t.score, 0)::integer,
    (select count(*)::int from public.team_members tm where tm.team_id = t.id),
    ld.repo_name,
    ld.issue_number,
    rd.amount,
    rd.created_at
  from public.teams t
  left join lateral (
    select r.name as repo_name, hi.github_issue_number as issue_number
    from public.contributions c
    join public.hackathon_issues hi on hi.id = c.issue_id
    join public.repositories r on r.id = hi.repository_id
    where c.team_id = t.id
      and c.points_awarded = true
    order by coalesce(c.merged_at, c.updated_at, c.created_at) desc
    limit 1
  ) ld on true
  left join lateral (
    select pt.amount, pt.created_at
    from public.point_transactions pt
    where pt.team_id = t.id
      and pt.amount > 0
      and pt.created_at > now() - interval '10 minutes'
    order by pt.created_at desc
    limit 1
  ) rd on true
  where t.event_id = p_event_id
  order by coalesce(t.score, 0) desc, t.name asc;
$$;

revoke all on function public.get_leaderboard(uuid) from public;
grant execute on function public.get_leaderboard(uuid) to anon, authenticated;

commit;
