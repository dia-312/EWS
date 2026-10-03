-- "Tell me when it is back" and "tell me if the price drops".
--
-- A visitor leaves an email address or a phone number for one product. This is
-- the only personal data the site keeps, so it is kept narrow: only the store's
-- admins can read it, nobody else can, and the owner can delete a request once it
-- has been handled (or on the visitor's request).

alter table public.notification_subscriptions
  add column if not exists price_at_subscribe numeric(12, 2),
  add column if not exists locale text not null default 'ar',
  add column if not exists notified_at timestamptz;

alter table public.notification_subscriptions
  add constraint notification_subscriptions_status_check check (status in ('pending', 'notified')),
  add constraint notification_subscriptions_locale_check check (locale in ('ar', 'en')),
  add constraint notification_subscriptions_destination_check check (char_length(destination) between 5 and 200);

-- One request per contact, product and kind of alert.
create unique index if not exists notification_subscriptions_unique
  on public.notification_subscriptions (product_id, type, lower(destination));

create index if not exists notification_subscriptions_store_idx
  on public.notification_subscriptions (store_id, status, created_at);

-- Visitors may only add a pending request for a product that is on sale in that store.
create policy notification_subscriptions_public_insert on public.notification_subscriptions
  for insert to anon, authenticated
  with check (
    status = 'pending'
    and notified_at is null
    and exists (
      select 1 from public.products p
      where p.id = product_id and p.store_id = notification_subscriptions.store_id and p.active
    )
  );

-- Admins already have update and delete on this table (the generic policies of the RLS migration).

grant insert on public.notification_subscriptions to anon;
