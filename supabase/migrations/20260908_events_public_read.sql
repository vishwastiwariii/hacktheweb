-- events: public read
--
-- Problem it fixes: `events` had RLS enabled with no SELECT policy, so every
-- read returned zero rows. Signed-out visitors got no landing-page stats, and
-- team creation failed with "Event Not Found" because createTeam() could not
-- read the active event row.
--
-- CLAUDE.md / README both list events as a public read (landing page,
-- registration, leaderboard header). This adds exactly that. Writes stay
-- admin-only (unchanged).
--
-- Safe to run more than once.

begin;

alter table public.events enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'events' and policyname = 'events_public_read'
  ) then
    create policy "events_public_read" on public.events
      for select using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where tablename = 'events' and policyname = 'events_admin_write'
  ) then
    create policy "events_admin_write" on public.events for all to authenticated
      using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin))
      with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));
  end if;
end $$;

commit;
