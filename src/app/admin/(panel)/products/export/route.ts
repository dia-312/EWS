import { getAdminSession } from "@/lib/auth";
import { guardFormula, toCsv } from "@/lib/csv";
import { type ExportableProduct, exportProductRow, IMPORT_COLUMNS } from "@/lib/product-import";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const PAGE = 1000;

/**
 * All of the store's products as a CSV file, in the same columns the import
 * reads: edit prices or stock in Excel, then import the file again.
 *
 *   GET /admin/products/export
 */
export async function GET() {
  const session = await getAdminSession();
  if (session.status !== "admin") {
    return Response.json({ error: { code: "UNAUTHORIZED", message: "Sign in as an admin." } }, { status: 401 });
  }

  const db = await createClient();
  const products: ExportableProduct[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      .from("products")
      .select(
        "id, slug, name_ar, name_en, category_id, brand_id, price, availability, short_description_ar, short_description_en, description_ar, description_en, search_aliases, featured, bestseller_manual, active, is_new_override, sort_order, categories(slug), brands(name)",
      )
      .eq("store_id", session.storeId)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) {
      return Response.json({ error: { code: "INTERNAL_ERROR", message: "Could not read the products." } }, { status: 500 });
    }
    products.push(...(data.map((product) => ({ ...product, price: Number(product.price) })) as ExportableProduct[]));
    if (data.length < PAGE) break;
  }

  const csv = toCsv([[...IMPORT_COLUMNS], ...products.map((product) => exportProductRow(product, guardFormula))]);
  const day = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="products-${day}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
