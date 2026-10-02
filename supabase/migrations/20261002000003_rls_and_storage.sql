-- Row Level Security, grants and storage buckets.
--
-- Public (anon + signed-in visitors): read active, public content only.
-- Admins (admin_profiles row): read/write rows of their own store only.
-- The service-role key bypasses RLS and must stay server-side.

-- ------------------------------------------------------------- helpers
create or replace function public.is_store_member(p_store uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_profiles ap
    where ap.id = (select auth.uid()) and ap.store_id = p_store
  );
$$;

-- owner / manager / editor may write; viewer is read-only.
create or replace function public.can_edit_store(p_store uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_profiles ap
    where ap.id = (select auth.uid())
      and ap.store_id = p_store
      and ap.role in ('owner', 'manager', 'editor')
  );
$$;

-- ----------------------------------------------------------- enable RLS
alter table public.stores enable row level security;
alter table public.store_settings enable row level security;
alter table public.store_theme enable row level security;
alter table public.admin_profiles enable row level security;
alter table public.categories enable row level security;
alter table public.brands enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.product_specs enable row level security;
alter table public.badges enable row level security;
alter table public.product_badges enable row level security;
alter table public.offers enable row level security;
alter table public.homepage_sections enable row level security;
alter table public.homepage_section_items enable row level security;
alter table public.analytics_events enable row level security;
alter table public.notification_subscriptions enable row level security;

-- ------------------------------------------------------- public reading
create policy stores_public_read on public.stores
  for select using (is_active);

create policy store_settings_public_read on public.store_settings
  for select using (exists (select 1 from public.stores s where s.id = store_id and s.is_active));

create policy store_theme_public_read on public.store_theme
  for select using (exists (select 1 from public.stores s where s.id = store_id and s.is_active));

create policy categories_public_read on public.categories
  for select using (active);

create policy brands_public_read on public.brands
  for select using (active);

create policy products_public_read on public.products
  for select using (active);

create policy product_images_public_read on public.product_images
  for select using (exists (select 1 from public.products p where p.id = product_id and p.active));

create policy product_specs_public_read on public.product_specs
  for select using (exists (select 1 from public.products p where p.id = product_id and p.active));

create policy badges_public_read on public.badges
  for select using (active);

create policy product_badges_public_read on public.product_badges
  for select using (exists (select 1 from public.products p where p.id = product_id and p.active));

-- Expired or not-yet-started offers are invisible to the public.
create policy offers_public_read on public.offers
  for select using (
    active
    and (start_at is null or start_at <= now())
    and (end_at is null or end_at > now())
  );

create policy homepage_sections_public_read on public.homepage_sections
  for select using (active);

create policy homepage_section_items_public_read on public.homepage_section_items
  for select using (exists (
    select 1 from public.homepage_sections hs where hs.id = section_id and hs.active
  ));

-- --------------------------------------------- anonymous analytics insert
-- Event shape is constrained by CHECKs on the table (allowed types, query
-- length, metadata size). No public read.
create policy analytics_public_insert on public.analytics_events
  for insert to anon, authenticated
  with check (exists (select 1 from public.stores s where s.id = store_id and s.is_active));

-- -------------------------------------------------------- admin reading
create policy admin_profiles_read_own on public.admin_profiles
  for select to authenticated using (id = (select auth.uid()));

create policy analytics_admin_read on public.analytics_events
  for select to authenticated using (public.is_store_member(store_id));

create policy notification_subscriptions_admin_read on public.notification_subscriptions
  for select to authenticated using (public.is_store_member(store_id));

-- Admins see inactive rows of their own store too (the public policies above
-- only expose active rows; policies are OR-ed).
do $$
declare
  t text;
begin
  foreach t in array array[
    'stores', 'categories', 'brands', 'products', 'badges', 'offers',
    'homepage_sections'
  ] loop
    execute format(
      'create policy %I on public.%I for select to authenticated
         using (public.is_store_member(%s))',
      t || '_admin_read', t, case when t = 'stores' then 'id' else 'store_id' end
    );
  end loop;

  foreach t in array array['store_settings', 'store_theme'] loop
    execute format(
      'create policy %I on public.%I for select to authenticated
         using (public.is_store_member(store_id))',
      t || '_admin_read', t
    );
  end loop;
end;
$$;

create policy product_images_admin_read on public.product_images
  for select to authenticated using (exists (
    select 1 from public.products p where p.id = product_id and public.is_store_member(p.store_id)));
create policy product_specs_admin_read on public.product_specs
  for select to authenticated using (exists (
    select 1 from public.products p where p.id = product_id and public.is_store_member(p.store_id)));
create policy product_badges_admin_read on public.product_badges
  for select to authenticated using (exists (
    select 1 from public.products p where p.id = product_id and public.is_store_member(p.store_id)));
create policy homepage_section_items_admin_read on public.homepage_section_items
  for select to authenticated using (exists (
    select 1 from public.homepage_sections hs where hs.id = section_id and public.is_store_member(hs.store_id)));

-- --------------------------------------------------------- admin writing
-- Tables that carry store_id directly.
do $$
declare
  t text;
begin
  foreach t in array array[
    'categories', 'brands', 'products', 'badges', 'offers', 'homepage_sections',
    'store_settings', 'store_theme', 'notification_subscriptions'
  ] loop
    execute format(
      'create policy %I on public.%I for insert to authenticated
         with check (public.can_edit_store(store_id))', t || '_admin_insert', t);
    execute format(
      'create policy %I on public.%I for update to authenticated
         using (public.can_edit_store(store_id))
         with check (public.can_edit_store(store_id))', t || '_admin_update', t);
    execute format(
      'create policy %I on public.%I for delete to authenticated
         using (public.can_edit_store(store_id))', t || '_admin_delete', t);
  end loop;
end;
$$;

-- stores: editing the store row itself is limited to owners/managers; rows are
-- created and removed only by the platform operator (service role).
create policy stores_admin_update on public.stores
  for update to authenticated
  using (public.can_edit_store(id))
  with check (public.can_edit_store(id));

-- Child tables: writable when the parent row belongs to an editable store.
do $$
declare
  spec record;
begin
  for spec in
    select * from (values
      ('product_images',  'products',          'product_id'),
      ('product_specs',   'products',          'product_id'),
      ('product_badges',  'products',          'product_id'),
      ('homepage_section_items', 'homepage_sections', 'section_id')
    ) as v(child, parent, fk)
  loop
    execute format(
      'create policy %I on public.%I for insert to authenticated
         with check (exists (select 1 from public.%I p
           where p.id = %I and public.can_edit_store(p.store_id)))',
      spec.child || '_admin_insert', spec.child, spec.parent, spec.fk);
    execute format(
      'create policy %I on public.%I for update to authenticated
         using (exists (select 1 from public.%I p
           where p.id = %I and public.can_edit_store(p.store_id)))
         with check (exists (select 1 from public.%I p
           where p.id = %I and public.can_edit_store(p.store_id)))',
      spec.child || '_admin_update', spec.child, spec.parent, spec.fk, spec.parent, spec.fk);
    execute format(
      'create policy %I on public.%I for delete to authenticated
         using (exists (select 1 from public.%I p
           where p.id = %I and public.can_edit_store(p.store_id)))',
      spec.child || '_admin_delete', spec.child, spec.parent, spec.fk);
  end loop;
end;
$$;

-- --------------------------------------------------------------- grants
-- RLS decides row access; grants decide which roles may touch a table at all.
grant usage on schema public to anon, authenticated;

grant select on
  public.stores, public.store_settings, public.store_theme, public.categories,
  public.brands, public.products, public.product_images, public.product_specs,
  public.badges, public.product_badges, public.offers, public.homepage_sections,
  public.homepage_section_items
to anon, authenticated;

grant insert on public.analytics_events to anon, authenticated;

grant select on public.admin_profiles, public.analytics_events,
  public.notification_subscriptions to authenticated;

grant insert, update, delete on
  public.categories, public.brands, public.products, public.product_images,
  public.product_specs, public.badges, public.product_badges, public.offers,
  public.homepage_sections, public.homepage_section_items,
  public.store_settings, public.store_theme, public.notification_subscriptions
to authenticated;

grant update on public.stores to authenticated;

-- -------------------------------------------------------------- storage
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('store-logos',     'store-logos',     true, 2097152,  array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']),
  ('store-banners',   'store-banners',   true, 5242880,  array['image/png', 'image/jpeg', 'image/webp']),
  ('product-images',  'product-images',  true, 5242880,  array['image/png', 'image/jpeg', 'image/webp']),
  ('category-images', 'category-images', true, 2097152,  array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Convention: object paths start with the store id: "<store_id>/<file>".
-- Buckets are public for reads via their public URLs; only store editors can write.
create policy storage_store_editors_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id in ('store-logos', 'store-banners', 'product-images', 'category-images')
    and public.can_edit_store(((storage.foldername(name))[1])::uuid)
  );

create policy storage_store_editors_update on storage.objects
  for update to authenticated
  using (
    bucket_id in ('store-logos', 'store-banners', 'product-images', 'category-images')
    and public.can_edit_store(((storage.foldername(name))[1])::uuid)
  );

create policy storage_store_editors_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id in ('store-logos', 'store-banners', 'product-images', 'category-images')
    and public.can_edit_store(((storage.foldername(name))[1])::uuid)
  );
