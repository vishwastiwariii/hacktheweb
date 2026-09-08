-- Make the admin guard reliable, permanently.
--
-- Problem it fixes: `profiles` rows were never created for auth users, and RLS
-- gave a signed-in user no way to read their own row. The admin guard runs
-- `select is_admin from profiles where id = auth.uid()` as the `authenticated`
-- role, got 0 rows, and redirected every admin away from /admin.
--
-- After this migration:
--   * every auth user automatically has a matching profiles row (id = users.id)
--   * github_username is kept in sync from the GitHub OAuth metadata
--   * a signed-in user can read (only) their own profile row
--   * is_admin stays admin-controlled — users have no write access to profiles
--
-- Safe to run more than once.

begin;

-- ---------------------------------------------------------------------------
-- 1. Provision a profile row on signup, and keep the username fresh on login
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, github_username)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'user_name',
      new.raw_user_meta_data ->> 'preferred_username',
      new.raw_user_meta_data ->> 'name',
      split_part(coalesce(new.email, ''), '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.handle_user_updated()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set github_username = coalesce(
    new.raw_user_meta_data ->> 'user_name',
    new.raw_user_meta_data ->> 'preferred_username',
    new.raw_user_meta_data ->> 'name',
    public.profiles.github_username
  )
  where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
  after update of raw_user_meta_data on auth.users
  for each row execute function public.handle_user_updated();

-- ---------------------------------------------------------------------------
-- 2. Backfill everyone who signed up before this migration
-- ---------------------------------------------------------------------------
insert into public.profiles (id, github_username)
select
  u.id,
  coalesce(
    u.raw_user_meta_data ->> 'user_name',
    u.raw_user_meta_data ->> 'preferred_username',
    u.raw_user_meta_data ->> 'name',
    split_part(coalesce(u.email, ''), '@', 1)
  )
from auth.users u
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 3. RLS: a signed-in user may read only their own profile row.
--    (No insert/update/delete policy -> users cannot self-promote to admin.)
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists "profiles_self_read" on public.profiles;
create policy "profiles_self_read" on public.profiles
  for select to authenticated
  using (id = auth.uid());

-- ---------------------------------------------------------------------------
-- 4. Initial admin seed. Change or remove this for other environments.
-- ---------------------------------------------------------------------------
update public.profiles
set is_admin = true
where github_username = 'vishwastiwariii';

commit;
