"use server";

import { revalidatePath } from "next/cache";
import { requireEditor } from "@/lib/auth";
import { decodeCsvBytes, parseCsv } from "@/lib/csv";
import {
  brandSlug,
  type ExistingProduct,
  type ImportErrorCode,
  type ImportColumn,
  type ImportPlan,
  MAX_IMPORT_BYTES,
  mergeRow,
  normalizeName,
  planImport,
} from "@/lib/product-import";
import { createClient } from "@/lib/supabase/server";

export type ImportFileError = "no_file" | "too_big" | "empty" | "no_header";

export type PreviewRow = {
  line: number;
  slug: string;
  label: string;
  kind: "create" | "update";
  errors: { column: ImportColumn; code: ImportErrorCode }[];
};

export type PreviewResult =
  | { error: ImportFileError | "failed" }
  | {
      rows: PreviewRow[];
      created: number;
      updated: number;
      invalid: number;
      newBrands: string[];
      unknownColumns: string[];
      missingRequiredColumns: ImportColumn[];
      tooManyRows: boolean;
    };

export type ApplyResult =
  | { error: ImportFileError | "nothing_to_import" | "failed"; saved?: number }
  | { created: number; updated: number; skipped: number };

type Db = Awaited<ReturnType<typeof createClient>>;

const PRODUCT_COLUMNS =
  "id, slug, name_ar, name_en, category_id, brand_id, price, availability, short_description_ar, short_description_en, description_ar, description_en, search_aliases, featured, bestseller_manual, active, is_new_override, sort_order";

const CHUNK = 100;

function chunks<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size));
  return result;
}

/** Reads the uploaded file into cells, or says why it cannot be used. */
async function readCells(formData: FormData): Promise<{ cells: string[][] } | { error: ImportFileError }> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "no_file" };
  if (file.size > MAX_IMPORT_BYTES) return { error: "too_big" };

  const cells = parseCsv(decodeCsvBytes(new Uint8Array(await file.arrayBuffer())));
  if (cells.length === 0) return { error: "empty" };
  if (cells.length === 1) return { error: "empty" };
  if (!cells[0].some((header) => header.trim() !== "")) return { error: "no_header" };
  return { cells };
}

async function buildPlan(db: Db, storeId: string, cells: string[][]) {
  const [categories, brands] = await Promise.all([
    db.from("categories").select("id, slug, name_ar, name_en").eq("store_id", storeId),
    db.from("brands").select("id, slug, name").eq("store_id", storeId),
  ]);
  if (categories.error) throw categories.error;
  if (brands.error) throw brands.error;

  // First pass only finds which slugs the file talks about, so only those products are loaded.
  const slugs = [
    ...new Set(
      planImport(cells, { categories: [], brands: [], existing: new Map() })
        .rows.map((row) => row.slug)
        .filter(Boolean),
    ),
  ];
  const existing = new Map<string, ExistingProduct>();
  for (const part of chunks(slugs, CHUNK)) {
    const { data, error } = await db
      .from("products")
      .select(PRODUCT_COLUMNS)
      .eq("store_id", storeId)
      .in("slug", part);
    if (error) throw error;
    for (const product of data) {
      existing.set(product.slug, { ...product, price: Number(product.price) } as ExistingProduct);
    }
  }

  const plan = planImport(cells, { categories: categories.data, brands: brands.data, existing });
  return { plan, existing };
}

function newBrandNames(plan: ImportPlan): string[] {
  const byKey = new Map<string, string>();
  for (const row of plan.rows) {
    if (row.errors.length > 0) continue;
    const brand = row.changes.brand;
    if (brand && "create" in brand) byKey.set(normalizeName(brand.create), brand.create);
  }
  return [...byKey.values()];
}

/** Checks the file and says what an import would do. Writes nothing. */
export async function previewImport(formData: FormData): Promise<PreviewResult> {
  const session = await requireEditor();
  const read = await readCells(formData);
  if ("error" in read) return read;

  try {
    const { plan } = await buildPlan(await createClient(), session.storeId, read.cells);
    const valid = plan.rows.filter((row) => row.errors.length === 0);
    return {
      rows: plan.rows.map(({ line, slug, label, kind, errors }) => ({ line, slug, label, kind, errors })),
      created: valid.filter((row) => row.kind === "create").length,
      updated: valid.filter((row) => row.kind === "update").length,
      invalid: plan.rows.length - valid.length,
      newBrands: newBrandNames(plan),
      unknownColumns: plan.unknownColumns,
      missingRequiredColumns: plan.missingRequiredColumns,
      tooManyRows: plan.tooManyRows,
    };
  } catch {
    return { error: "failed" };
  }
}

/** Saves every valid row of the file; rows with errors are skipped. The file is read again, never trusted from the preview. */
export async function applyImport(formData: FormData): Promise<ApplyResult> {
  const session = await requireEditor();
  const read = await readCells(formData);
  if ("error" in read) return read;

  const db = await createClient();
  let saved = 0;
  try {
    const { plan, existing } = await buildPlan(db, session.storeId, read.cells);
    const valid = plan.rows.filter((row) => row.errors.length === 0);
    if (valid.length === 0) return { error: "nothing_to_import" };

    // Brands first (one request), so each product can point at its brand.
    const brandIds = new Map<string, string>();
    const names = newBrandNames(plan);
    if (names.length > 0) {
      const { data, error } = await db
        .from("brands")
        .upsert(
          names.map((name) => ({ store_id: session.storeId, name, slug: brandSlug(name) })),
          { onConflict: "store_id,slug" },
        )
        .select("id, name");
      if (error) throw error;
      for (const brand of data) brandIds.set(normalizeName(brand.name), brand.id);
    }

    const products = valid.map((row) => {
      const brand = row.changes.brand;
      const brandId =
        brand === undefined ? undefined : brand === null ? null : "id" in brand ? brand.id : (brandIds.get(normalizeName(brand.create)) ?? null);
      return mergeRow(row, existing.get(row.slug), brandId, session.storeId);
    });

    // One request per hundred products: the database is far away, so round trips are what costs time.
    for (const part of chunks(products, CHUNK)) {
      const { error } = await db.from("products").upsert(part, { onConflict: "store_id,slug" });
      if (error) throw error;
      saved += part.length;
    }

    revalidatePath("/admin/products");
    return {
      created: valid.filter((row) => row.kind === "create").length,
      updated: valid.filter((row) => row.kind === "update").length,
      skipped: plan.rows.length - valid.length,
    };
  } catch {
    if (saved > 0) revalidatePath("/admin/products");
    return { error: "failed", saved };
  }
}
