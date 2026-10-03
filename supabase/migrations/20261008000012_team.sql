-- Managing who can sign in to the admin, from the admin itself.
--
-- A person's login (email + password) lives in Supabase Auth and is created in the
-- Supabase dashboard (Authentication > Users > Add user): the browser can never
-- create accounts, and no secret key is needed by the site. These functions only
-- connect an existing login to the store, with a role, or take it away again.
--
-- Every function checks that the caller is an OWNER of the store. They run with the
-- rights of their author (security definer) because they read auth.users.

create or replace function public.team_members()
returns table (
  id uuid,
  email text,
  role text,
  display_name text,
  created_at timestamptz,
  last_sign_in_at timestamptz
)
language sql
stable
security definer
set search_path = public, auth
as $$
  select ap.id, u.email::text, ap.role, ap.display_name, ap.created_at, u.last_sign_in_at
  from public.admin_profiles ap
  join auth.users u on u.id = ap.id
  where ap.store_id = (
    select me.store_id from public.admin_profiles me
    where me.id = (select auth.uid()) and me.role = 'owner'
  )
  order by ap.created_at, u.email;
$$;

-- Returns: ok | not_owner | bad_role | user_not_found | belongs_elsewhere
create or replace function public.add_team_member(p_email text, p_role text, p_name text default null)
returns text
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_store uuid;
  v_user uuid;
begin
  select store_id into v_store
  from public.admin_profiles
  where id = (select auth.uid()) and role = 'owner';
  if v_store is null then return 'not_owner'; end if;

  if p_role is null or p_role not in ('owner', 'manager', 'editor', 'viewer') then return 'bad_role'; end if;

  select id into v_user from auth.users where lower(email) = lower(btrim(p_email));
  if v_user is null then return 'user_not_found'; end if;

  if exists (select 1 from public.admin_profiles where id = v_user and store_id <> v_store) then
    return 'belongs_elsewhere';
  end if;

  insert into public.admin_profiles (id, store_id, role, display_name)
  values (v_user, v_store, p_role, nullif(btrim(coalesce(p_name, '')), ''))
  on conflict (id) do update
    set role = excluded.role,
        display_name = coalesce(excluded.display_name, public.admin_profiles.display_name);
  return 'ok';
end;
$$;

-- Returns: ok | not_owner | bad_role | self | not_found.  Nobody changes their own role,
-- so a store always keeps the owner who is doing the changing.
create or replace function public.set_team_role(p_user uuid, p_role text)
returns text
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_store uuid;
begin
  select store_id into v_store
  from public.admin_profiles
  where id = (select auth.uid()) and role = 'owner';
  if v_store is null then return 'not_owner'; end if;

  if p_role is null or p_role not in ('owner', 'manager', 'editor', 'viewer') then return 'bad_role'; end if;
  if p_user = (select auth.uid()) then return 'self'; end if;

  update public.admin_profiles set role = p_role where id = p_user and store_id = v_store;
  if not found then return 'not_found'; end if;
  return 'ok';
end;
$$;

-- Returns: ok | not_owner | self | not_found.  The login itself stays in Supabase Auth;
-- it just no longer opens this store's admin.
create or replace function public.remove_team_member(p_user uuid)
returns text
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_store uuid;
begin
  select store_id into v_store
  from public.admin_profiles
  where id = (select auth.uid()) and role = 'owner';
  if v_store is null then return 'not_owner'; end if;

  if p_user = (select auth.uid()) then return 'self'; end if;

  delete from public.admin_profiles where id = p_user and store_id = v_store;
  if not found then return 'not_found'; end if;
  return 'ok';
end;
$$;

revoke execute on function public.team_members() from public, anon;
revoke execute on function public.add_team_member(text, text, text) from public, anon;
revoke execute on function public.set_team_role(uuid, text) from public, anon;
revoke execute on function public.remove_team_member(uuid) from public, anon;

grant execute on function public.team_members() to authenticated;
grant execute on function public.add_team_member(text, text, text) to authenticated;
grant execute on function public.set_team_role(uuid, text) to authenticated;
grant execute on function public.remove_team_member(uuid) to authenticated;
