-- Claims expire.
--
-- A claim on an issue that is still unsolved 30 minutes after it was taken is
-- released, so a team can't sit on issues it isn't finishing. "Solved" is
-- hackathon_issues.solved — set when a "Fixes #n" PR merges — so an open,
-- unmerged PR does NOT keep the claim alive. A solved issue's claim is kept
-- forever (it records who did the work).
--
-- Expiry is enforced without relying on a scheduler:
--   * release_expired_claims() deletes every expired claim. The app calls it
--     before reading claims (issue lists, claim action, team dashboard), so
--     what users see is always current.
--   * A BEFORE INSERT trigger frees an expired claim on the same issue, so the
--     unique (issue_id) constraint never blocks a new claim on a lapsed one.
--   * If pg_cron is enabled, it also runs every minute as a sweep.
--
-- The 30 minutes is mirrored in CLAIM_TTL_MINUTES
-- (app/lib/services/claim.service.ts) for the countdown in the UI — change both.
--
-- Safe to run more than once.

begin;

create or replace function public.release_expired_claims()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_released integer;
begin
  delete from public.issue_claims c
   using public.hackathon_issues i
   where i.id = c.issue_id
     and not i.solved
     and c.created_at < now() - interval '30 minutes';
  get diagnostics v_released = row_count;
  return v_released;
end;
$$;

-- Only ever deletes claims that are already expired, so it's safe for anyone to
-- call — public issue lists run it for signed-out visitors too.
revoke all on function public.release_expired_claims() from public;
grant execute on function public.release_expired_claims() to anon, authenticated;

-- SECURITY DEFINER: participants have no DELETE policy on issue_claims, and
-- the stale row usually belongs to another team.
create or replace function public.release_expired_claim_on_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.issue_claims c
   using public.hackathon_issues i
   where c.issue_id = new.issue_id
     and i.id = c.issue_id
     and not i.solved
     and c.created_at < now() - interval '30 minutes';
  return new;
end;
$$;

drop trigger if exists issue_claims_release_expired on public.issue_claims;
create trigger issue_claims_release_expired
  before insert on public.issue_claims
  for each row
  execute function public.release_expired_claim_on_insert();

-- Optional sweep. Enable pg_cron under Database → Extensions to get it; without
-- it the calls above keep everything correct.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'release-expired-claims',
      '* * * * *',
      'select public.release_expired_claims()'
    );
  end if;
end $$;

commit;
