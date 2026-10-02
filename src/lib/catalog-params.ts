/**
 * The product listing keeps all of its state in the URL (?q=&category=&brand=...)
 * so results can be shared and bookmarked. This module reads and writes that
 * state; it knows nothing about the database.
 */

export const SORT_KEYS = ["newest", "price_asc", "price_desc", "name"] as const;
export type SortKey = (typeof SORT_KEYS)[number];

export const AVAILABILITY_VALUES = ["in_stock", "limited", "out_of_stock"] as const;
export type AvailabilityValue = (typeof AVAILABILITY_VALUES)[number];

export const PAGE_SIZE = 24;
const MAX_PAGE = 500;

export type CatalogParams = {
  q: string;
  category: string;
  brands: string[];
  min: number | null;
  max: number | null;
  availability: AvailabilityValue[];
  onSale: boolean;
  sort: SortKey;
  page: number;
};

type RawParams = Record<string, string | string[] | undefined>;

function list(value: string | string[] | undefined): string[] {
  const parts = Array.isArray(value) ? value : value ? [value] : [];
  return parts.flatMap((part) => part.split(",")).map((part) => part.trim()).filter(Boolean);
}

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

function price(value: string | string[] | undefined): number | null {
  const text = first(value);
  if (!text) return null;
  const number = Number(text.replace(",", "."));
  return Number.isFinite(number) && number >= 0 && number <= 9_999_999 ? number : null;
}

/** Reads the URL state, ignoring anything that is not a valid value. */
export function parseCatalogParams(raw: RawParams): CatalogParams {
  const sort = first(raw.sort) as SortKey;
  const page = Math.floor(Number(first(raw.page)));

  let min = price(raw.min);
  let max = price(raw.max);
  if (min !== null && max !== null && min > max) [min, max] = [max, min];

  return {
    q: first(raw.q).slice(0, 100),
    category: first(raw.category),
    brands: list(raw.brand).slice(0, 20),
    min,
    max,
    availability: list(raw.availability).filter((value): value is AvailabilityValue =>
      (AVAILABILITY_VALUES as readonly string[]).includes(value),
    ),
    onSale: first(raw.sale) === "1",
    sort: (SORT_KEYS as readonly string[]).includes(sort) ? sort : "newest",
    page: Number.isFinite(page) && page >= 1 ? Math.min(page, MAX_PAGE) : 1,
  };
}

/** Number of filters the visitor has applied (sorting and paging do not count). */
export function activeFilterCount(params: CatalogParams): number {
  return (
    (params.q ? 1 : 0) +
    (params.category ? 1 : 0) +
    params.brands.length +
    (params.min !== null || params.max !== null ? 1 : 0) +
    params.availability.length +
    (params.onSale ? 1 : 0)
  );
}

/** Builds a query string for a variation of the current state; defaults are left out. */
export function toQueryString(params: Partial<CatalogParams>): string {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.category) search.set("category", params.category);
  for (const brand of params.brands ?? []) search.append("brand", brand);
  if (params.min != null) search.set("min", String(params.min));
  if (params.max != null) search.set("max", String(params.max));
  for (const value of params.availability ?? []) search.append("availability", value);
  if (params.onSale) search.set("sale", "1");
  if (params.sort && params.sort !== "newest") search.set("sort", params.sort);
  if (params.page && params.page > 1) search.set("page", String(params.page));
  const text = search.toString();
  return text ? `?${text}` : "";
}

export function totalPages(total: number, pageSize = PAGE_SIZE): number {
  return Math.max(1, Math.ceil(total / pageSize));
}
