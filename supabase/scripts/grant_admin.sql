-- Gives an existing Supabase Auth user admin access to a store.
--
-- 1. Create the user first: Supabase dashboard > Authentication > Users >
--    Add user (tick "Auto Confirm User"). Never create admins from the app.
-- 2. Replace the two values below, then run this in the SQL Editor
--    (or: pnpm dlx supabase db query --linked -f supabase/scripts/grant_admin.sql).
--
-- Roles: owner | manager | editor | viewer (viewer is read-only).

insert into public.admin_profiles (id, store_id, role, display_name)
select u.id, s.id, 'owner', 'Owner'
from auth.users u
cross join public.stores s
where u.email = 'owner@example.com'   -- <-- the admin's login email
  and s.slug = 'ews'                  -- <-- the store slug (matches STORE_SLUG)
on conflict (id) do update
  set store_id = excluded.store_id,
      role = excluded.role;

-- Sanity check: should return one row.
select ap.role, u.email, s.slug
from public.admin_profiles ap
join auth.users u on u.id = ap.id
join public.stores s on s.id = ap.store_id
where s.slug = 'ews';
