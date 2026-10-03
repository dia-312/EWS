/**
 * Homepage sections. Their order, visibility and texts live in the
 * homepage_sections table; type-specific settings live in its `config` JSON.
 */

export const SECTION_TYPES = [
  "hero",
  "categories",
  "offers",
  "new_arrivals",
  "best_sellers",
  "featured",
  "deal_of_day",
  "trust",
  "contact",
  "banner",
] as const;
export type SectionType = (typeof SECTION_TYPES)[number];

/** Sections that list products, and so have a "how many" setting. */
export const PRODUCT_SECTION_TYPES: readonly SectionType[] = [
  "offers",
  "new_arrivals",
  "best_sellers",
  "featured",
];

/** Types the owner can add (each only once). The banner has no content yet. */
export const ADDABLE_SECTION_TYPES: readonly SectionType[] = SECTION_TYPES.filter(
  (type) => type !== "banner",
);

export const DEFAULT_LIMIT = 8;
export const MIN_LIMIT = 2;
export const MAX_LIMIT = 24;

/** Reads a banner section's picture and link from its config JSON. */
export function readBanner(config: unknown): { imageUrl: string | null; linkUrl: string | null } {
  const value = config && typeof config === "object" ? (config as Record<string, unknown>) : {};
  return {
    imageUrl: typeof value.image_url === "string" && value.image_url !== "" ? value.image_url : null,
    linkUrl: typeof value.link_url === "string" && value.link_url !== "" ? value.link_url : null,
  };
}

export function isProductSection(type: string): boolean {
  return (PRODUCT_SECTION_TYPES as readonly string[]).includes(type);
}

/** How many products a section shows, read defensively from its config JSON. */
export function readLimit(config: unknown): number {
  const value =
    config && typeof config === "object" ? (config as Record<string, unknown>).limit : undefined;
  const number = typeof value === "number" ? Math.floor(value) : NaN;
  return Number.isFinite(number) && number >= MIN_LIMIT && number <= MAX_LIMIT ? number : DEFAULT_LIMIT;
}

/** Section types the store does not have yet, in the usual homepage order. */
export function missingSectionTypes(existing: readonly string[]): SectionType[] {
  return ADDABLE_SECTION_TYPES.filter((type) => !existing.includes(type));
}

/** Moves the item with `id` one step and returns the new order of ids (unchanged at the edges). */
export function moveId(ids: readonly string[], id: string, direction: "up" | "down"): string[] {
  const result = [...ids];
  const from = result.indexOf(id);
  const to = direction === "up" ? from - 1 : from + 1;
  if (from === -1 || to < 0 || to >= result.length) return result;
  [result[from], result[to]] = [result[to], result[from]];
  return result;
}
