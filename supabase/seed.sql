-- Initial data for the first store. Safe to re-run (idempotent).
-- Everything here is editable from the admin dashboard; the store name is a
-- placeholder. Product data is SAMPLE data for development: names, prices and
-- specs are illustrative, and no images/contact numbers are seeded.

do $$
declare
  s uuid;
begin
  -- ----------------------------------------------------------- store
  insert into public.stores (name, slug, currency_code, locale_default, timezone)
  values ('EWS Electronics', 'ews', 'ILS', 'ar', 'Asia/Hebron')
  on conflict (slug) do nothing;

  select id into s from public.stores where slug = 'ews';

  insert into public.store_settings (store_id, about_text_ar, about_text_en, working_hours)
  values (
    s,
    'متجرك لأحدث الأجهزة الإلكترونية والإكسسوارات.',
    'Your store for the latest electronics and accessories.',
    '{
      "sat": [{"open": "09:00", "close": "21:00"}],
      "sun": [{"open": "09:00", "close": "21:00"}],
      "mon": [{"open": "09:00", "close": "21:00"}],
      "tue": [{"open": "09:00", "close": "21:00"}],
      "wed": [{"open": "09:00", "close": "21:00"}],
      "thu": [{"open": "09:00", "close": "21:00"}],
      "fri": []
    }'::jsonb
  )
  on conflict (store_id) do nothing;

  insert into public.store_theme (store_id, preset)
  values (s, 'modern')
  on conflict (store_id) do nothing;

  -- ------------------------------------------------------ categories
  insert into public.categories (store_id, name_ar, name_en, slug, icon, display_order)
  values
    (s, 'موبايلات',                        'Mobile Phones',                 'mobiles',               'smartphone', 1),
    (s, 'إكسسوارات وسماعات',               'Accessories & Headphones',      'accessories-headphones', 'headphones', 2),
    (s, 'أجهزة منزلية وتلفزيونات',         'Home Appliances & TVs',         'home-appliances-tvs',   'tv',         3),
    (s, 'قطع إلكترونية ولوازم موبايلات',   'Electronic Parts & Phone Supplies', 'electronic-parts',  'cpu',        4)
  on conflict (store_id, slug) do nothing;

  -- ----------------------------------------------------------- brands
  insert into public.brands (store_id, name, slug)
  values
    (s, 'Samsung', 'samsung'), (s, 'Apple', 'apple'), (s, 'Xiaomi', 'xiaomi'),
    (s, 'Sony', 'sony'), (s, 'JBL', 'jbl'), (s, 'LG', 'lg'),
    (s, 'Anker', 'anker'), (s, 'Baseus', 'baseus')
  on conflict (store_id, slug) do nothing;

  -- ----------------------------------------------------------- badges
  insert into public.badges (store_id, key, label_ar, label_en, color, display_order)
  values
    (s, 'new',         'جديد',        'NEW',         '#16a34a', 1),
    (s, 'sale',        'عرض',         'SALE',        '#dc2626', 2),
    (s, 'featured',    'مميز',        'FEATURED',    '#7c3aed', 3),
    (s, 'best_seller', 'الأكثر مبيعًا', 'BEST SELLER', '#ea580c', 4),
    (s, 'limited',     'كمية محدودة', 'LIMITED',     '#ca8a04', 5)
  on conflict (store_id, key) do nothing;

  -- --------------------------------------------------------- products
  insert into public.products (
    store_id, category_id, brand_id, name_ar, name_en, slug,
    short_description_ar, short_description_en, price, availability,
    featured, bestseller_manual, search_aliases
  )
  select s, c.id, b.id, v.name_ar, v.name_en, v.slug,
         v.short_ar, v.short_en, v.price, v.availability,
         v.featured, v.bestseller, v.aliases
  from (values
    ('mobiles', 'samsung', 'سامسونج جالاكسي A55', 'Samsung Galaxy A55', 'samsung-galaxy-a55',
      'هاتف بشاشة AMOLED وكاميرا 50 ميغابكسل.', 'AMOLED display phone with a 50MP camera.',
      1450.00, 'in_stock', true, false, array['جلاكسي', 'galaxy', 'a55', 'سامسونغ']),
    ('mobiles', 'apple', 'آيفون 15', 'iPhone 15', 'iphone-15',
      'آيفون بشاشة OLED وكاميرا 48 ميغابكسل.', 'iPhone with an OLED display and 48MP camera.',
      3200.00, 'in_stock', false, false, array['ايفون', 'iphone', 'ابل', 'apple']),
    ('mobiles', 'xiaomi', 'شاومي ريدمي نوت 13', 'Xiaomi Redmi Note 13', 'xiaomi-redmi-note-13',
      'أداء قوي وكاميرا 108 ميغابكسل بسعر اقتصادي.', 'Strong performance and a 108MP camera at a value price.',
      780.00, 'limited', false, true, array['ريدمي', 'redmi', 'note 13', 'شاومي', 'ام اي']),

    ('accessories-headphones', 'jbl', 'سماعة جي بي إل Tune 520BT', 'JBL Tune 520BT', 'jbl-tune-520bt',
      'سماعة لاسلكية خفيفة ببطارية طويلة.', 'Lightweight wireless headphones with long battery life.',
      120.00, 'in_stock', false, true, array['jbl', 'جي بي ال', 'سماعة بلوتوث', 'headphones']),
    ('accessories-headphones', 'sony', 'سماعة سوني WH-1000XM5', 'Sony WH-1000XM5', 'sony-wh-1000xm5',
      'سماعة بخاصية عزل الضوضاء الفعّال.', 'Headphones with industry-leading noise cancelling.',
      1350.00, 'limited', true, false, array['سوني', 'sony', 'xm5', 'عزل ضوضاء', 'noise cancelling']),
    ('accessories-headphones', 'anker', 'شاحن أنكر 20 واط USB-C', 'Anker 20W USB-C Charger', 'anker-20w-usb-c-charger',
      'شاحن سريع وصغير الحجم.', 'Compact fast charger.',
      55.00, 'in_stock', false, false, array['شاحن', 'charger', 'انكر', 'فاست']),
    ('accessories-headphones', 'baseus', 'كيبل بيسوس USB-C 100 واط', 'Baseus USB-C Cable 100W', 'baseus-usb-c-cable-100w',
      'كيبل شحن سريع بطول متر.', 'Fast-charging cable, 1 m.',
      35.00, 'in_stock', false, false, array['كيبل', 'cable', 'سلك', 'بيسوس']),

    ('home-appliances-tvs', 'samsung', 'تلفزيون سامسونج 55 بوصة Crystal UHD', 'Samsung 55" Crystal UHD TV', 'samsung-55-crystal-uhd-tv',
      'تلفزيون ذكي بدقة 4K.', 'Smart 4K TV.',
      1850.00, 'in_stock', true, false, array['شاشة', 'تلفزيون', 'tv', 'تلفاز', '55']),
    ('home-appliances-tvs', 'lg', 'تلفزيون إل جي ذكي 43 بوصة', 'LG 43" Smart TV', 'lg-43-smart-tv',
      'تلفزيون ذكي Full HD بنظام webOS.', 'Full HD smart TV running webOS.',
      1250.00, 'in_stock', false, false, array['ال جي', 'lg', 'شاشة', 'تلفزيون', 'تلفاز', '43']),
    ('home-appliances-tvs', 'lg', 'غسالة إل جي أمامية 8 كغ', 'LG 8 kg Front Load Washer', 'lg-8kg-front-load-washer',
      'غسالة أوتوماتيك بسعة 8 كيلوغرام.', 'Automatic washer with 8 kg capacity.',
      1900.00, 'out_of_stock', false, false, array['غسالة', 'washer', 'washing machine', 'ال جي']),

    ('electronic-parts', null, 'حامي شاشة زجاجي 9H', 'Tempered Glass Screen Protector 9H', 'tempered-glass-screen-protector-9h',
      'حامي شاشة زجاجي بصلابة 9H (حسب موديل الجهاز).', '9H tempered glass protector (model-specific).',
      15.00, 'in_stock', false, false, array['لزقة', 'سكرين', 'حماية شاشة', 'screen protector', 'glass']),
    ('electronic-parts', null, 'طقم أدوات تصليح 25 قطعة', '25-in-1 Phone Repair Tool Kit', 'phone-repair-tool-kit-25',
      'طقم أدوات لفتح وتصليح الهواتف.', 'Tool kit for opening and repairing phones.',
      45.00, 'in_stock', false, false, array['عدة', 'تصليح', 'مفكات', 'repair kit', 'tools'])
  ) as v(cat, brand, name_ar, name_en, slug, short_ar, short_en, price, availability, featured, bestseller, aliases)
  join public.categories c on c.store_id = s and c.slug = v.cat
  left join public.brands b on b.store_id = s and b.slug = v.brand
  on conflict (store_id, slug) do nothing;

  -- ------------------------------------------------------------ specs
  insert into public.product_specs (product_id, spec_key, value_ar, value_en, display_order)
  select p.id, v.key, v.value_ar, v.value_en, v.ord
  from (values
    ('samsung-galaxy-a55', 'screen',  'Super AMOLED 6.6 بوصة 120Hz', '6.6" Super AMOLED 120Hz', 1),
    ('samsung-galaxy-a55', 'ram',     '8 جيجابايت', '8 GB', 2),
    ('samsung-galaxy-a55', 'storage', '256 جيجابايت', '256 GB', 3),
    ('samsung-galaxy-a55', 'camera',  '50 ميغابكسل', '50 MP', 4),
    ('samsung-galaxy-a55', 'battery', '5000 مللي أمبير', '5000 mAh', 5),

    ('iphone-15', 'screen',  'OLED 6.1 بوصة', '6.1" OLED', 1),
    ('iphone-15', 'ram',     '6 جيجابايت', '6 GB', 2),
    ('iphone-15', 'storage', '128 جيجابايت', '128 GB', 3),
    ('iphone-15', 'camera',  '48 ميغابكسل', '48 MP', 4),

    ('xiaomi-redmi-note-13', 'screen',  'AMOLED 6.67 بوصة 120Hz', '6.67" AMOLED 120Hz', 1),
    ('xiaomi-redmi-note-13', 'ram',     '8 جيجابايت', '8 GB', 2),
    ('xiaomi-redmi-note-13', 'storage', '256 جيجابايت', '256 GB', 3),
    ('xiaomi-redmi-note-13', 'camera',  '108 ميغابكسل', '108 MP', 4),
    ('xiaomi-redmi-note-13', 'battery', '5000 مللي أمبير', '5000 mAh', 5),

    ('jbl-tune-520bt', 'type',         'فوق الأذن لاسلكية', 'On-ear wireless', 1),
    ('jbl-tune-520bt', 'battery_life', 'حتى 57 ساعة', 'Up to 57 hours', 2),
    ('jbl-tune-520bt', 'connectivity', 'بلوتوث 5.3', 'Bluetooth 5.3', 3),

    ('sony-wh-1000xm5', 'type',         'حول الأذن، عزل ضوضاء', 'Over-ear, noise cancelling', 1),
    ('sony-wh-1000xm5', 'battery_life', 'حتى 30 ساعة', 'Up to 30 hours', 2),
    ('sony-wh-1000xm5', 'connectivity', 'بلوتوث 5.2', 'Bluetooth 5.2', 3),

    ('anker-20w-usb-c-charger', 'power', '20 واط', '20 W', 1),
    ('anker-20w-usb-c-charger', 'ports', 'منفذ USB-C واحد', '1x USB-C', 2),

    ('baseus-usb-c-cable-100w', 'power',  '100 واط', '100 W', 1),
    ('baseus-usb-c-cable-100w', 'length', 'متر واحد', '1 m', 2),

    ('samsung-55-crystal-uhd-tv', 'screen_size', '55 بوصة', '55"', 1),
    ('samsung-55-crystal-uhd-tv', 'resolution',  '4K UHD', '4K UHD', 2),
    ('samsung-55-crystal-uhd-tv', 'smart_os',    'Tizen', 'Tizen', 3),

    ('lg-43-smart-tv', 'screen_size', '43 بوصة', '43"', 1),
    ('lg-43-smart-tv', 'resolution',  'Full HD', 'Full HD', 2),
    ('lg-43-smart-tv', 'smart_os',    'webOS', 'webOS', 3),

    ('lg-8kg-front-load-washer', 'capacity',   '8 كيلوغرام', '8 kg', 1),
    ('lg-8kg-front-load-washer', 'spin_speed', '1200 دورة بالدقيقة', '1200 rpm', 2),

    ('tempered-glass-screen-protector-9h', 'hardness',      '9H', '9H', 1),
    ('tempered-glass-screen-protector-9h', 'compatibility', 'حسب موديل الجهاز', 'Model-specific', 2),

    ('phone-repair-tool-kit-25', 'pieces', '25 قطعة', '25 pieces', 1)
  ) as v(slug, key, value_ar, value_en, ord)
  join public.products p on p.store_id = s and p.slug = v.slug
  on conflict (product_id, spec_key) do nothing;

  -- ----------------------------------------------- product badges
  insert into public.product_badges (product_id, badge_id)
  select p.id, b.id
  from (values
    ('samsung-galaxy-a55',  'featured'),
    ('sony-wh-1000xm5',     'featured'),
    ('samsung-55-crystal-uhd-tv', 'featured'),
    ('xiaomi-redmi-note-13', 'best_seller'),
    ('jbl-tune-520bt',      'best_seller'),
    ('xiaomi-redmi-note-13', 'limited'),
    ('sony-wh-1000xm5',     'limited')
  ) as v(slug, badge)
  join public.products p on p.store_id = s and p.slug = v.slug
  join public.badges b on b.store_id = s and b.key = v.badge
  on conflict do nothing;

  -- ------------------------------------------------------------ offer
  insert into public.offers (store_id, product_id, title_ar, title_en, old_price, new_price, start_at, end_at)
  select s, p.id, 'عرض الأسبوع', 'Deal of the week', 1350.00, 1150.00, now(), now() + interval '7 days'
  from public.products p
  where p.store_id = s and p.slug = 'sony-wh-1000xm5'
    and not exists (select 1 from public.offers o where o.product_id = p.id);

  -- ------------------------------------------------- homepage sections
  if not exists (select 1 from public.homepage_sections where store_id = s) then
    insert into public.homepage_sections (store_id, type, title_ar, title_en, display_order)
    values
      (s, 'hero',         'مرحبًا بكم',           'Welcome',            1),
      (s, 'categories',   'تسوّق حسب الفئة',      'Shop by category',   2),
      (s, 'offers',       'عروض خاصة',           'Special offers',     3),
      (s, 'new_arrivals', 'وصل حديثًا',           'New arrivals',       4),
      (s, 'best_sellers', 'الأكثر مبيعًا',        'Best sellers',       5),
      (s, 'featured',     'منتجات مميزة',         'Featured products',  6),
      (s, 'deal_of_day',  'صفقة اليوم',           'Deal of the day',    7),
      (s, 'trust',        'لماذا تختارنا؟',       'Why choose us',      8),
      (s, 'contact',      'تواصل معنا',           'Contact us',         9);
  end if;
end;
$$;
