-- "Solved" issues.
--
-- Once a merged pull request resolves an issue ("Fixes #n"), that issue is done:
-- no other team can claim it, and it renders as solved wherever issues are
-- listed.
--
-- `solved` is platform-derived state, in the same category as `available`:
--   * the GitHub webhook flips it when the resolving PR merges
--     (app/lib/github/handle-pull-request.ts), recomputed from `contributions`
--     so a later rejection can clear it;
--   * re-import never touches it (import writes a fixed GitHub-owned column set);
--   * a BEFORE INSERT trigger on issue_claims enforces "no new claims" in the
--     database, so the rule holds even if a caller forgets to check.
--
-- Safe to run more than once.

begin;

alter table public.hackathon_issues
  add column if not exists solved boolean not null default false;

alter table public.hackathon_issues
  add column if not exists solved_at timestamptz;

-- Hard stop: a solved issue cannot be claimed.
create or replace function public.reject_claim_on_solved_issue()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if exists (
    select 1 from public.hackathon_issues
    where id = new.issue_id and solved
  ) then
    raise exception 'issue % is already solved and cannot be claimed', new.issue_id
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists issue_claims_block_solved on public.issue_claims;
create trigger issue_claims_block_solved
  before insert on public.issue_claims
  for each row
  execute function public.reject_claim_on_solved_issue();

commit;
