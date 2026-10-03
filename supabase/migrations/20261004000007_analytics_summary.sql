-- One round trip for the whole admin analytics page. SECURITY INVOKER: the
-- caller's RLS applies, so only members of the store get any rows back.
create or replace function public.analytics_summary(
  p_store uuid,
  p_days integer default 30,
  p_tz text default 'UTC'
)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with ev as (
    select *
    from public.analytics_events
    where store_id = p_store
      and created_at >= now() - make_interval(days => greatest(1, least(coalesce(p_days, 30), 365)))
  )
  select jsonb_build_object(
    'totals', (
      select coalesce(jsonb_object_agg(event_type, c), '{}'::jsonb)
      from (select event_type, count(*) as c from ev group by event_type) t
    ),
    'visitors', (
      select count(distinct session_id) from ev where event_type = 'page_view'
    ),
    'daily', (
      select coalesce(jsonb_agg(jsonb_build_object('day', d, 'views', v) order by d), '[]'::jsonb)
      from (
        select (created_at at time zone p_tz)::date as d, count(*) as v
        from ev
        where event_type = 'product_view'
        group by 1
      ) t
    ),
    'top_products', (
      select coalesce(jsonb_agg(to_jsonb(t) order by t.views desc, t.name_en), '[]'::jsonb)
      from (
        select
          p.id,
          p.name_ar,
          p.name_en,
          count(*) filter (where ev.event_type = 'product_view') as views,
          count(*) filter (where ev.event_type = 'whatsapp_click') as whatsapp,
          count(*) filter (where ev.event_type = 'phone_click') as phone,
          count(*) filter (where ev.event_type = 'share') as shares,
          count(*) filter (where ev.event_type = 'qr_scan') as qr_scans,
          count(*) filter (where ev.event_type = 'favorite_add') as favorites
        from ev
        join public.products p on p.id = ev.product_id
        group by p.id, p.name_ar, p.name_en
        having count(*) filter (where ev.event_type = 'product_view') > 0
        order by views desc, p.name_en
        limit 10
      ) t
    ),
    'top_searches', (
      select coalesce(jsonb_agg(jsonb_build_object('query', q, 'count', c) order by c desc, q), '[]'::jsonb)
      from (
        select lower(btrim(search_query)) as q, count(*) as c
        from ev
        where event_type = 'search' and btrim(coalesce(search_query, '')) <> ''
        group by 1
        order by c desc, q
        limit 10
      ) t
    )
  );
$$;

grant execute on function public.analytics_summary(uuid, integer, text) to authenticated;
revoke execute on function public.analytics_summary(uuid, integer, text) from anon;
