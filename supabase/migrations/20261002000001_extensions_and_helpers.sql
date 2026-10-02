-- Extensions and generic helpers.

create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;

-- Keeps updated_at current on every UPDATE.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Normalizes text for Arabic/English search:
--  * unifies alef forms (أ إ آ ٱ -> ا), alef maqsura -> ya (ى -> ي), ta marbuta -> ha (ة -> ه)
--  * strips tashkeel (diacritics) and tatweel
--  * lowercases and removes Latin accents
--  * collapses whitespace
-- The application applies the same function to the user's query before matching.
create or replace function public.normalize_search(input text)
returns text
language sql
stable
set search_path = public, extensions
as $$
  select trim(
    regexp_replace(
      extensions.unaccent(
        lower(
          regexp_replace(
            translate(coalesce(input, ''), 'أإآٱىة', 'اااايه'),
            '[ً-ْٰـ]', '', 'g'
          )
        )
      ),
      '\s+', ' ', 'g'
    )
  );
$$;
