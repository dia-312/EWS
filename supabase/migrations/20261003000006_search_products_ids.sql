-- search_products() gains p_ids, so a list of known products (a visitor's
-- favourites) can be loaded in the same shape as search results. Postgres cannot
-- change a function's argument list in place, so the previous version is dropped.
-- It still runs as the caller (security invoker): row level security keeps
-- visitors limited to active, public content.

drop function if exists public.search_products(
  uuid, text, uuid, uuid[], numeric, numeric, text[], text, boolean, text, text, integer, integer
);

create function public.search_products(
  p_store uuid,
  p_query text default null,
  p_category uuid default null,
  p_brands uuid[] default null,
  p_min numeric default null,
  p_max numeric default null,
  p_availability text[] default null,
  p_collection text default null,   -- featured | bestsellers | new | offers
  p_on_sale boolean default false,
  p_sort text default 'newest',     -- newest | price_asc | price_desc | name
  p_locale text default 'ar',
  p_limit integer default 24,
  p_offset integer default 0,
  p_ids uuid[] default null
)
returns table (
  id uuid,
  slug text,
  name_ar text,
  name_en text,
  short_description_ar text,
  short_description_en text,
  price numeric,
  offer_price numeric,
  offer_old_price numeric,
  offer_ends_at timestamptz,
  availability text,
  featured boolean,
  bestseller boolean,
  is_new boolean,
  created_at timestamptz,
  brand_name text,
  category_slug text,
  category_name_ar text,
  category_name_en text,
  image_url text,
  image_alt_ar text,
  image_alt_en text,
  badge_keys text[],
  total_count bigint
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  with q as (
    select regexp_split_to_array(nullif(public.normalize_search(p_query), ''), ' ') as words
  ),
  base as (
    select
      p.*,
      o.new_price as o_price,
      o.old_price as o_old,
      o.end_at as o_end,
      coalesce(o.new_price, p.price) as effective_price,
      coalesce(p.is_new_override, p.created_at > now() - interval '30 days') as computed_new
    from public.products p
    left join lateral (
      select off.new_price, off.old_price, off.end_at
      from public.offers off
      where off.product_id = p.id
        and off.active
        and (off.start_at is null or off.start_at <= now())
        and (off.end_at is null or off.end_at > now())
      order by off.new_price asc
      limit 1
    ) o on true
    where p.store_id = p_store
      and p.active
      and (p_ids is null or p.id = any(p_ids))
      and (p_category is null or p.category_id = p_category)
      and (p_brands is null or p.brand_id = any(p_brands))
      and (p_availability is null or p.availability = any(p_availability))
      -- every word of the query must appear in the normalized search text
      and not exists (
        select 1
        from q, unnest(coalesce(q.words, '{}'::text[])) as word
        where word <> ''
          and p.search_text not like
            '%' || replace(replace(replace(word, '\', '\\'), '%', '\%'), '_', '\_') || '%'
      )
  ),
  filtered as (
    select b.*
    from base b
    where (p_min is null or b.effective_price >= p_min)
      and (p_max is null or b.effective_price <= p_max)
      and (not p_on_sale or b.o_price is not null)
      and (
        p_collection is null
        or (p_collection = 'featured' and b.featured)
        or (p_collection = 'bestsellers' and b.bestseller_manual)
        or (p_collection = 'new' and b.computed_new)
        or (p_collection = 'offers' and b.o_price is not null)
      )
  )
  select
    f.id,
    f.slug,
    f.name_ar,
    f.name_en,
    f.short_description_ar,
    f.short_description_en,
    f.price,
    f.o_price,
    f.o_old,
    f.o_end,
    f.availability,
    f.featured,
    f.bestseller_manual,
    f.computed_new,
    f.created_at,
    br.name,
    c.slug,
    c.name_ar,
    c.name_en,
    img.public_url,
    img.alt_text_ar,
    img.alt_text_en,
    coalesce(bk.keys, '{}'::text[]),
    count(*) over ()
  from filtered f
  join public.categories c on c.id = f.category_id and c.active
  left join public.brands br on br.id = f.brand_id
  left join lateral (
    select pi.public_url, pi.alt_text_ar, pi.alt_text_en
    from public.product_images pi
    where pi.product_id = f.id
    order by pi.is_primary desc, pi.display_order asc
    limit 1
  ) img on true
  left join lateral (
    select array_agg(bd.key order by bd.display_order) as keys
    from public.product_badges pb
    join public.badges bd on bd.id = pb.badge_id and bd.active
    where pb.product_id = f.id
  ) bk on true
  order by
    case when p_sort = 'price_asc' then f.effective_price end asc,
    case when p_sort = 'price_desc' then f.effective_price end desc,
    case when p_sort = 'name' then
      case when p_locale = 'en' then coalesce(f.name_en, f.name_ar) else f.name_ar end
    end asc,
    f.sort_order asc,
    f.created_at desc,
    f.id asc
  limit greatest(1, least(coalesce(p_limit, 24), 100))
  offset greatest(0, coalesce(p_offset, 0));
$$;

grant execute on function public.search_products(
  uuid, text, uuid, uuid[], numeric, numeric, text[], text, boolean, text, text, integer, integer, uuid[]
) to anon, authenticated;
