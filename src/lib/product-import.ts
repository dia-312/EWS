import { unguardFormula } from "@/lib/csv";
import { slugify, slugSchema } from "@/lib/slug";
import { AVAILABILITY, price as priceSchema, type Availability } from "@/lib/validations/product";

/** The columns of the products file, in the order the template and the export use. */
export const IMPORT_COLUMNS = [
  "slug",
  "name_ar",
  "name_en",
  "category",
  "brand",
  "price",
  "availability",
  "short_description_ar",
  "short_description_en",
  "description_ar",
  "description_en",
  "search_aliases",
  "featured",
  "bestseller",
] as const;

export type ImportColumn = (typeof IMPORT_COLUMNS)[number];

export const MAX_IMPORT_ROWS = 500;
export const MAX_IMPORT_BYTES = 1024 * 1024;

export type ImportErrorCode =
  | "name_required"
  | "category_required"
  | "category_unknown"
  | "price_required"
  | "price_invalid"
  | "availability_invalid"
  | "yes_no_invalid"
  | "slug_invalid"
  | "slug_required"
  | "slug_duplicate"
  | "too_long";

export type RowError = { column: ImportColumn; code: ImportErrorCode };

export type CategoryRef = { id: string; slug: string; name_ar: string; name_en: string | null };
export type BrandRef = { id: string; slug: string; name: string };

/** The part of an existing product the import may carry over unchanged. */
export type ExistingProduct = {
  id: string;
  slug: string;
  name_ar: string;
  name_en: string | null;
  category_id: string;
  brand_id: string | null;
  price: number;
  availability: string;
  short_description_ar: string | null;
  short_description_en: string | null;
  description_ar: string | null;
  description_en: string | null;
  search_aliases: string[];
  featured: boolean;
  bestseller_manual: boolean;
  active: boolean;
  is_new_override: boolean | null;
  sort_order: number;
};

export type ImportLookup = {
  categories: CategoryRef[];
  brands: BrandRef[];
  existing: Map<string, ExistingProduct>;
};

/** What a row asks to set. A missing key means "leave as it is" (update) or "use the default" (create). */
export type ProductChanges = {
  name_ar?: string;
  name_en?: string | null;
  category_id?: string;
  /** An existing brand's id, or the name of a brand to create. */
  brand?: { id: string } | { create: string } | null;
  price?: number;
  availability?: Availability;
  short_description_ar?: string | null;
  short_description_en?: string | null;
  description_ar?: string | null;
  description_en?: string | null;
  search_aliases?: string[];
  featured?: boolean;
  bestseller_manual?: boolean;
};

export type PlannedRow = {
  /** Line number in the file (the header is line 1). */
  line: number;
  slug: string;
  label: string;
  kind: "create" | "update";
  changes: ProductChanges;
  errors: RowError[];
};

export type ImportPlan = {
  rows: PlannedRow[];
  unknownColumns: string[];
  missingRequiredColumns: ImportColumn[];
  tooManyRows: boolean;
};

// ---------------------------------------------------------------- helpers

/** Western digits and decimal point, for prices typed in Arabic-Indic digits. */
function westernDigits(value: string): string {
  return value
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0))
    .replace(/٫/g, ".")
    .replace(/٬/g, ",");
}

/** For comparing names: case, spaces, Arabic diacritics and look-alike letters do not matter. */
export function normalizeName(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[ً-ْـ]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeHeader(value: string): string {
  return value.replace(/^﻿/, "").trim().toLowerCase().replace(/[\s-]+/g, "_");
}

const AVAILABILITY_WORDS: Record<string, Availability> = {
  in_stock: "in_stock",
  "in stock": "in_stock",
  available: "in_stock",
  متوفر: "in_stock",
  متوفره: "in_stock",
  limited: "limited",
  "limited stock": "limited",
  "low stock": "limited",
  محدود: "limited",
  "كميه محدوده": "limited",
  out_of_stock: "out_of_stock",
  "out of stock": "out_of_stock",
  unavailable: "out_of_stock",
  "sold out": "out_of_stock",
  نفذ: "out_of_stock",
  نافذ: "out_of_stock",
  "غير متوفر": "out_of_stock",
  "غير متوفره": "out_of_stock",
};

function parseAvailability(value: string): Availability | null {
  const key = normalizeName(value).replace(/_/g, " ");
  const direct = AVAILABILITY_WORDS[normalizeName(value)] ?? AVAILABILITY_WORDS[key];
  if (direct) return direct;
  return (AVAILABILITY as readonly string[]).includes(value.trim()) ? (value.trim() as Availability) : null;
}

const YES = new Set(["yes", "y", "true", "1", "نعم", "ايوه", "اي"]);
const NO = new Set(["no", "n", "false", "0", "لا", "كلا"]);

function parseYesNo(value: string): boolean | null {
  const key = normalizeName(value);
  if (YES.has(key)) return true;
  if (NO.has(key)) return false;
  return null;
}

/** Aliases are separated by | ; , or new lines (Latin or Arabic punctuation). */
function parseAliasList(value: string): string[] {
  const seen = new Set<string>();
  for (const part of value.split(/[|;,\n،؛]/)) {
    const alias = part.trim();
    if (alias) seen.add(alias);
  }
  return [...seen];
}

const MAX_LENGTH: Partial<Record<ImportColumn, number>> = {
  name_ar: 160,
  name_en: 160,
  short_description_ar: 300,
  short_description_en: 300,
  description_ar: 5000,
  description_en: 5000,
};
const MAX_ALIASES = 20;
const MAX_ALIAS_LENGTH = 60;
const MAX_BRAND_LENGTH = 80;

// ------------------------------------------------------------------- plan

/**
 * Turns the cells of a products file into a plan: one entry per row, saying
 * whether it creates or updates a product and what is wrong with it. Nothing
 * is written here.
 *
 * Rules the owner can rely on:
 *  - the slug identifies a product: a known slug updates it, a new one creates it;
 *  - on updates, an empty cell (or a column that is absent) keeps the current value;
 *  - new products need name_ar, category and price, and start hidden because
 *    they have no image yet (images are added in the product page).
 */
export function planImport(cells: string[][], lookup: ImportLookup): ImportPlan {
  const [headerRow = [], ...dataRows] = cells;
  const headers = headerRow.map(normalizeHeader);
  const known = new Set<string>(IMPORT_COLUMNS);

  const columnIndex = new Map<ImportColumn, number>();
  const unknownColumns: string[] = [];
  headers.forEach((header, index) => {
    if (known.has(header)) {
      if (!columnIndex.has(header as ImportColumn)) columnIndex.set(header as ImportColumn, index);
    } else if (header !== "") {
      unknownColumns.push(headerRow[index].trim());
    }
  });

  const missingRequiredColumns = (["name_ar", "category", "price"] as const).filter((column) => !columnIndex.has(column));

  const categoryByKey = new Map<string, CategoryRef>();
  for (const category of lookup.categories) {
    categoryByKey.set(normalizeName(category.slug), category);
    categoryByKey.set(normalizeName(category.name_ar), category);
    if (category.name_en) categoryByKey.set(normalizeName(category.name_en), category);
  }
  const brandByKey = new Map<string, BrandRef>();
  for (const brand of lookup.brands) {
    brandByKey.set(normalizeName(brand.slug), brand);
    brandByKey.set(normalizeName(brand.name), brand);
  }

  const seenSlugs = new Set<string>();
  const tooManyRows = dataRows.length > MAX_IMPORT_ROWS;

  const rows = dataRows.slice(0, MAX_IMPORT_ROWS).map((row, offset): PlannedRow => {
    const line = offset + 2;
    const cell = (column: ImportColumn): string => {
      const index = columnIndex.get(column);
      return index === undefined ? "" : unguardFormula((row[index] ?? "").trim());
    };
    const errors: RowError[] = [];
    const fail = (column: ImportColumn, code: ImportErrorCode) => errors.push({ column, code });

    // ---- slug: given, or made from the English name
    let slug = cell("slug");
    if (slug === "") {
      slug = slugify(cell("name_en"));
      if (slug === "") fail("slug", "slug_required");
    } else if (!slugSchema.safeParse(slug).success) {
      fail("slug", "slug_invalid");
    }
    if (slug !== "" && seenSlugs.has(slug)) fail("slug", "slug_duplicate");
    if (slug !== "") seenSlugs.add(slug);

    const existing = slug !== "" ? lookup.existing.get(slug) : undefined;
    const kind = existing ? "update" : "create";
    const changes: ProductChanges = {};

    // ---- required for new products only
    const nameAr = cell("name_ar");
    if (nameAr !== "") changes.name_ar = nameAr;
    else if (kind === "create") fail("name_ar", "name_required");

    const categoryText = cell("category");
    if (categoryText !== "") {
      const category = categoryByKey.get(normalizeName(categoryText));
      if (category) changes.category_id = category.id;
      else fail("category", "category_unknown");
    } else if (kind === "create") {
      fail("category", "category_required");
    }

    const priceText = cell("price");
    if (priceText !== "") {
      const parsed = priceSchema.safeParse(westernDigits(priceText));
      if (parsed.success) changes.price = parsed.data;
      else fail("price", "price_invalid");
    } else if (kind === "create") {
      fail("price", "price_required");
    }

    // ---- optional
    const availabilityText = cell("availability");
    if (availabilityText !== "") {
      const availability = parseAvailability(availabilityText);
      if (availability) changes.availability = availability;
      else fail("availability", "availability_invalid");
    }

    const textColumns = [
      "name_en",
      "short_description_ar",
      "short_description_en",
      "description_ar",
      "description_en",
    ] as const;
    for (const column of textColumns) {
      const value = cell(column);
      if (value === "") continue;
      if (value.length > (MAX_LENGTH[column] ?? Infinity)) fail(column, "too_long");
      else changes[column] = value;
    }
    if (cell("name_ar").length > (MAX_LENGTH.name_ar ?? Infinity)) fail("name_ar", "too_long");

    const brandText = cell("brand");
    if (brandText !== "") {
      const brand = brandByKey.get(normalizeName(brandText));
      if (brand) changes.brand = { id: brand.id };
      else if (brandText.length > MAX_BRAND_LENGTH) fail("brand", "too_long");
      else changes.brand = { create: brandText };
    }

    const aliasText = cell("search_aliases");
    if (aliasText !== "") {
      const aliases = parseAliasList(aliasText);
      if (aliases.length > MAX_ALIASES || aliases.some((alias) => alias.length > MAX_ALIAS_LENGTH)) {
        fail("search_aliases", "too_long");
      } else {
        changes.search_aliases = aliases;
      }
    }

    for (const [column, key] of [
      ["featured", "featured"],
      ["bestseller", "bestseller_manual"],
    ] as const) {
      const value = cell(column);
      if (value === "") continue;
      const flag = parseYesNo(value);
      if (flag === null) fail(column, "yes_no_invalid");
      else changes[key] = flag;
    }

    return {
      line,
      slug,
      label: changes.name_ar ?? existing?.name_ar ?? (cell("name_en") || slug),
      kind,
      changes,
      errors,
    };
  });

  return { rows, unknownColumns, missingRequiredColumns, tooManyRows };
}

/** The complete row to save: the existing product (if any) with the file's changes on top. */
export function mergeRow(
  row: PlannedRow,
  existing: ExistingProduct | undefined,
  brandId: string | null | undefined,
  storeId: string,
) {
  const { changes } = row;
  return {
    ...(existing ? { id: existing.id } : {}),
    store_id: storeId,
    slug: row.slug,
    name_ar: changes.name_ar ?? existing!.name_ar,
    name_en: changes.name_en ?? existing?.name_en ?? null,
    category_id: changes.category_id ?? existing!.category_id,
    brand_id: brandId === undefined ? (existing?.brand_id ?? null) : brandId,
    price: changes.price ?? existing!.price,
    availability: changes.availability ?? existing?.availability ?? "in_stock",
    short_description_ar: changes.short_description_ar ?? existing?.short_description_ar ?? null,
    short_description_en: changes.short_description_en ?? existing?.short_description_en ?? null,
    description_ar: changes.description_ar ?? existing?.description_ar ?? null,
    description_en: changes.description_en ?? existing?.description_en ?? null,
    search_aliases: changes.search_aliases ?? existing?.search_aliases ?? [],
    featured: changes.featured ?? existing?.featured ?? false,
    bestseller_manual: changes.bestseller_manual ?? existing?.bestseller_manual ?? false,
    // New products have no image yet, so they start hidden; existing ones keep their visibility.
    active: existing?.active ?? false,
    is_new_override: existing?.is_new_override ?? null,
    sort_order: existing?.sort_order ?? 0,
  };
}

/** A stable slug for a brand created by an import, also for Arabic names that have no Latin letters. */
export function brandSlug(name: string): string {
  const latin = slugify(name);
  if (latin !== "") return latin;
  let hash = 5381;
  for (const char of normalizeName(name)) hash = ((hash * 33) ^ char.codePointAt(0)!) >>> 0;
  return `brand-${hash.toString(16)}`;
}

export type ExportableProduct = ExistingProduct & {
  categories: { slug: string } | null;
  brands: { name: string } | null;
};

/** One product as the cells of an export row, in IMPORT_COLUMNS order (ready to be imported again). */
export function exportProductRow(product: ExportableProduct, guard: (value: string) => string): string[] {
  const text = (value: string | null) => guard(value ?? "");
  const yesNo = (value: boolean) => (value ? "yes" : "no");
  const byColumn: Record<ImportColumn, string> = {
    slug: product.slug,
    name_ar: text(product.name_ar),
    name_en: text(product.name_en),
    category: product.categories?.slug ?? "",
    brand: text(product.brands?.name ?? null),
    price: String(product.price),
    availability: product.availability,
    short_description_ar: text(product.short_description_ar),
    short_description_en: text(product.short_description_en),
    description_ar: text(product.description_ar),
    description_en: text(product.description_en),
    search_aliases: text(product.search_aliases.join(" | ")),
    featured: yesNo(product.featured),
    bestseller: yesNo(product.bestseller_manual),
  };
  return IMPORT_COLUMNS.map((column) => byColumn[column]);
}
