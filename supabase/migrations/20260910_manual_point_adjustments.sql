-- Manual point adjustments by an admin.
--
-- Like approve_contribution(), this is ONE transaction: write an ADJUSTMENT
-- row to the ledger and move the cached teams.score by the same amount. The
-- ledger stays the source of truth — the score is never changed on its own.
-- Every adjustment carries a reason and the admin's id (created_by).
--
-- Safe to run more than once.

begin;

create or replace function public.adjust_team_points(
  p_team_id uuid,
  p_amount integer,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin  uuid := auth.uid();
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_team   public.teams%rowtype;
  v_score  integer;
begin
  if v_admin is null then
    raise exception 'not authenticated' using errcode = 'insufficient_privilege';
  end if;
  if not exists (select 1 from public.profiles where id = v_admin and is_admin) then
    raise exception 'not authorized' using errcode = 'insufficient_privilege';
  end if;

  if p_amount is null or p_amount = 0 then
    raise exception 'amount must be a non-zero whole number' using errcode = 'raise_exception';
  end if;
  if abs(p_amount) > 10000 then
    raise exception 'amount must be between -10000 and 10000' using errcode = 'raise_exception';
  end if;
  if v_reason is null then
    raise exception 'a reason is required' using errcode = 'raise_exception';
  end if;

  -- Lock the team row so two concurrent adjustments can't both pass the
  -- negative-score check against the same starting score.
  select * into v_team from public.teams where id = p_team_id for update;
  if not found then
    raise exception 'team not found' using errcode = 'no_data_found';
  end if;
  if coalesce(v_team.score, 0) + p_amount < 0 then
    raise exception 'adjustment would take the team below 0 points' using errcode = 'raise_exception';
  end if;

  -- 1. ledger
  insert into public.point_transactions
    (event_id, team_id, contribution_id, amount, reason, kind, created_by)
  values
    (v_team.event_id, v_team.id, null, p_amount, v_reason, 'ADJUSTMENT', v_admin);

  -- 2. cached score
  update public.teams
     set score = coalesce(score, 0) + p_amount
   where id = v_team.id
  returning score into v_score;

  return jsonb_build_object(
    'team_id', v_team.id,
    'amount', p_amount,
    'score', v_score
  );
end;
$$;

revoke all on function public.adjust_team_points(uuid, integer, text) from public, anon;
grant execute on function public.adjust_team_points(uuid, integer, text) to authenticated;

commit;
