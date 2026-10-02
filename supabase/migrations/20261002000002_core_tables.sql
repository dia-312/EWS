-- Core schema. Every business table carries store_id so the same schema can
-- host more than one store later; v1 runs one store per deployment.

-- ---------------------------------------------------------------- stores
create table public.stores (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  logo_url text,
  currency_code text not null default 'ILS',
  locale_default text not null default 'ar' check (locale_default in ('ar', 'en')),
  timezone text not null default 'Asia/Hebron',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.store_settings (
  store_id uuid primary key references public.stores (id) on delete cascade,
  about_text_ar text,
  about_text_en text,
  phone text,
  whatsapp text,
  instagram_url text,
  facebook_url text,
  address_ar text,
  address_en text,
  map_url text,
  -- Shape: {"sat": [{"open": "09:00", "close": "21:00"}], "fri": []}
  -- Keys: sat, sun, mon, tue, wed, thu, fri. Empty array = closed that day.
  working_hours jsonb not null default '{}'::jsonb,
  seo_title text,
  seo_description text,
  updated_at timestamptz not null default now()
);

-- Colors are validated as hex so the theme can never carry arbitrary CSS.
create table public.store_theme (
  store_id uuid primary key references public.stores (id) on delete cascade,
  preset text not null default 'modern'
    check (preset in ('modern', 'minimal', 'gaming', 'luxury', 'tech')),
  primary_color text check (primary_color ~ '^#[0-9a-fA-F]{6}$'),
  secondary_color text check (secondary_color ~ '^#[0-9a-fA-F]{6}$'),
  accent_color text check (accent_color ~ '^#[0-9a-fA-F]{6}$'),
  surface_color text check (surface_color ~ '^#[0-9a-fA-F]{6}$'),
  text_color text check (text_color ~ '^#[0-9a-fA-F]{6}$'),
  font_key text,
  radius text check (radius in ('none', 'sm', 'md', 'lg', 'full')),
  logo_variant text,
  updated_at timestamptz not null default now()
);

-- Admin membership. Rows are provisioned by the platform operator
-- (SQL / service role), never by the browser.
create table public.admin_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  store_id uuid not null references public.stores (id) on delete cascade,
  role text not null default 'owner'
    check (role in ('owner', 'manager', 'editor', 'viewer')),
  display_name text,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------- catalog
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  name_ar text not null,
  name_en text,
  slug text not null check (slug ~ '^[^\s/?#]+$'),
  description_ar text,
  description_en text,
  image_url text,
  icon text,
  display_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, slug)
);

create table public.brands (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  name text not null,
  slug text not null check (slug ~ '^[^\s/?#]+$'),
  logo_url text,
  active boolean not null default true,
  unique (store_id, slug)
);

-- Pricing: `price` is the regular price. Promotions live in `offers`; the
-- storefront derives "on sale" from an active offer, never from this table.
create table public.products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  -- RESTRICT: a category cannot be deleted while products depend on it.
  category_id uuid not null references public.categories (id) on delete restrict,
  brand_id uuid references public.brands (id) on delete set null,
  name_ar text not null,
  name_en text,
  slug text not null check (slug ~ '^[^\s/?#]+$'),
  short_description_ar text,
  short_description_en text,
  description_ar text,
  description_en text,
  price numeric(12, 2) not null check (price >= 0),
  availability text not null default 'in_stock'
    check (availability in ('in_stock', 'limited', 'out_of_stock')),
  active boolean not null default true,
  featured boolean not null default false,
  bestseller_manual boolean not null default false,
  -- null = automatic (by created_at), true = always "new", false = never "new"
  is_new_override boolean,
  sort_order integer not null default 0,
  -- Extra search terms (Arabic/English aliases, common misspellings).
  search_aliases text[] not null default '{}',
  -- Maintained by trigger; normalized text used by trigram search.
  search_text text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, slug)
);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  storage_path text not null,
  public_url text,
  alt_text_ar text,
  alt_text_en text,
  display_order integer not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index product_images_one_primary
  on public.product_images (product_id) where is_primary;

create table public.product_specs (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  spec_key text not null,
  value_ar text,
  value_en text,
  display_order integer not null default 0,
  unique (product_id, spec_key)
);

-- Data-driven badges. NEW and SALE can also be derived automatically from
-- created_at / active offers; this table holds the curated ones.
create table public.badges (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  key text not null,
  label_ar text not null,
  label_en text,
  color text check (color ~ '^#[0-9a-fA-F]{6}$'),
  display_order integer not null default 0,
  active boolean not null default true,
  unique (store_id, key)
);

create table public.product_badges (
  product_id uuid not null references public.products (id) on delete cascade,
  badge_id uuid not null references public.badges (id) on delete cascade,
  primary key (product_id, badge_id)
);

-- --------------------------------------------------------------- offers
create table public.offers (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  title_ar text,
  title_en text,
  old_price numeric(12, 2) check (old_price >= 0),
  new_price numeric(12, 2) not null check (new_price >= 0),
  start_at timestamptz,
  end_at timestamptz,
  active boolean not null default true,
  banner_image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_at is null or start_at is null or end_at > start_at)
);

-- ------------------------------------------------------------- homepage
create table public.homepage_sections (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  type text not null check (type in (
    'hero', 'categories', 'offers', 'new_arrivals', 'best_sellers',
    'featured', 'deal_of_day', 'banner', 'trust', 'contact'
  )),
  title_ar text,
  title_en text,
  subtitle_ar text,
  subtitle_en text,
  config jsonb not null default '{}'::jsonb,
  display_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.homepage_section_items (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.homepage_sections (id) on delete cascade,
  product_id uuid references public.products (id) on delete cascade,
  category_id uuid references public.categories (id) on delete cascade,
  display_order integer not null default 0,
  check (product_id is not null or category_id is not null)
);

-- ------------------------------------------------------------ analytics
create table public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  event_type text not null check (event_type in (
    'page_view', 'product_view', 'search', 'whatsapp_click', 'phone_click',
    'share', 'favorite_add', 'favorite_remove', 'compare_add',
    'compare_remove', 'qr_scan'
  )),
  product_id uuid references public.products (id) on delete set null,
  category_id uuid references public.categories (id) on delete set null,
  search_query text check (char_length(search_query) <= 200),
  session_id text check (char_length(session_id) <= 64),
  metadata jsonb not null default '{}'::jsonb check (pg_column_size(metadata) <= 2048),
  created_at timestamptz not null default now()
);

-- ------------------------------------------- notifications (future/premium)
create table public.notification_subscriptions (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  type text not null check (type in ('restock', 'price_drop')),
  channel text not null check (channel in ('email', 'push', 'other')),
  destination text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

-- -------------------------------------------------------------- indexes
create index products_store_active_idx on public.products (store_id, active);
create index products_store_category_active_idx on public.products (store_id, category_id, active);
create index products_store_brand_active_idx on public.products (store_id, brand_id, active);
create index products_store_created_idx on public.products (store_id, created_at desc);
create index products_search_trgm_idx on public.products
  using gin (search_text extensions.gin_trgm_ops);

create index categories_store_order_idx on public.categories (store_id, display_order);
create index homepage_sections_store_order_idx on public.homepage_sections (store_id, display_order);
create index homepage_section_items_section_idx on public.homepage_section_items (section_id, display_order);
create index product_images_product_idx on public.product_images (product_id, display_order);
create index product_specs_product_idx on public.product_specs (product_id, display_order);
create index offers_store_active_idx on public.offers (store_id, active, end_at);
create index offers_product_idx on public.offers (product_id);
create index analytics_store_type_created_idx on public.analytics_events (store_id, event_type, created_at);
create index analytics_store_product_idx on public.analytics_events (store_id, product_id)
  where product_id is not null;
create index admin_profiles_store_idx on public.admin_profiles (store_id);

-- ------------------------------------------------------------- triggers
do $$
declare
  t text;
begin
  foreach t in array array[
    'stores', 'store_settings', 'store_theme', 'categories', 'products',
    'offers', 'homepage_sections'
  ] loop
    execute format(
      'create trigger %I before update on public.%I
         for each row execute function public.set_updated_at()',
      t || '_set_updated_at', t
    );
  end loop;
end;
$$;

-- Rebuilds products.search_text from the product plus its brand/category names.
create or replace function public.products_set_search_text()
returns trigger
language plpgsql
set search_path = public, extensions
as $$
declare
  v_brand text;
  v_cat_ar text;
  v_cat_en text;
begin
  select b.name into v_brand from public.brands b where b.id = new.brand_id;
  select c.name_ar, c.name_en into v_cat_ar, v_cat_en
    from public.categories c where c.id = new.category_id;

  new.search_text := public.normalize_search(concat_ws(' ',
    new.name_ar, new.name_en, v_brand, v_cat_ar, v_cat_en,
    array_to_string(new.search_aliases, ' '),
    new.short_description_ar, new.short_description_en
  ));
  return new;
end;
$$;

create trigger products_set_search_text
  before insert or update on public.products
  for each row execute function public.products_set_search_text();

-- Renaming a brand/category refreshes the search text of its products
-- (a no-op UPDATE re-fires the BEFORE trigger above).
create or replace function public.refresh_products_on_brand_change()
returns trigger
language plpgsql
as $$
begin
  update public.products set search_aliases = search_aliases where brand_id = new.id;
  return new;
end;
$$;

create or replace function public.refresh_products_on_category_change()
returns trigger
language plpgsql
as $$
begin
  update public.products set search_aliases = search_aliases where category_id = new.id;
  return new;
end;
$$;

create trigger brands_refresh_products
  after update of name on public.brands
  for each row when (old.name is distinct from new.name)
  execute function public.refresh_products_on_brand_change();

create trigger categories_refresh_products
  after update of name_ar, name_en on public.categories
  for each row when (old.name_ar is distinct from new.name_ar or old.name_en is distinct from new.name_en)
  execute function public.refresh_products_on_category_change();
