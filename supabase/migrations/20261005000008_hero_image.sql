-- Hero banner picture of the homepage (the picture itself lives in the store-banners bucket).
alter table public.store_settings add column if not exists hero_image_url text;
