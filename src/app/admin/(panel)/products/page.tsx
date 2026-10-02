import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ProductRowActions } from "@/components/admin/product-row-actions";
import { Button, buttonClass } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { SelectField } from "@/components/ui/select";
import { requireAdmin } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { formatDate, formatPrice, pickLocalized } from "@/lib/format";
import { thumbUrl } from "@/lib/images";
import { escapeLike, normalizeSearch } from "@/lib/search";
import { getCurrentStore } from "@/lib/store";
import { createClient } from "@/lib/supabase/server";
import { AVAILABILITY } from "@/lib/validations/product";

const PAGE_SIZE = 20;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Params = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

/** Small primary-image preview for the list (the compressed thumbnail variant). */
function ProductThumb({ url }: { url: string | null | undefined }) {
  if (!url) {
    return <div aria-hidden className="size-12 shrink-0 rounded-lg border border-dashed border-border bg-surface" />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={thumbUrl(url)}
      alt=""
      width={48}
      height={48}
      loading="lazy"
      className="size-12 shrink-0 rounded-lg border border-border bg-background object-contain"
    />
  );
}

const AVAILABILITY_STYLE: Record<string, string> = {
  in_stock: "bg-green-100 text-green-800",
  limited: "bg-amber-100 text-amber-800",
  out_of_stock: "bg-red-100 text-red-800",
};

export default async function AdminProductsPage({
  searchParams,
}: PageProps<"/admin/products">) {
  const [session, locale, t, store, params] = await Promise.all([
    requireAdmin(),
    getLocale(),
    getTranslations("admin.products"),
    getCurrentStore(),
    searchParams as Promise<Params>,
  ]);
  const db = await createClient();

  const q = first(params.q);
  const category = UUID.test(first(params.category)) ? first(params.category) : "";
  const availability = (AVAILABILITY as readonly string[]).includes(first(params.availability))
    ? first(params.availability)
    : "";
  const status = ["active", "inactive"].includes(first(params.status)) ? first(params.status) : "";
  const page = Math.max(1, Math.floor(Number(first(params.page))) || 1);
  const saved = ["created", "updated"].includes(first(params.saved)) ? first(params.saved) : "";

  let query = db
    .from("products")
    .select(
      "id, name_ar, name_en, slug, price, availability, active, featured, created_at, categories(name_ar, name_en), brands(name), product_images(public_url, is_primary)",
      { count: "exact" },
    )
    .eq("store_id", session.storeId);
  if (q) query = query.ilike("search_text", `%${escapeLike(normalizeSearch(q))}%`);
  if (category) query = query.eq("category_id", category);
  if (availability) query = query.eq("availability", availability);
  if (status) query = query.eq("active", status === "active");

  const from = (page - 1) * PAGE_SIZE;
  const [{ data: products, count, error }, { data: categories }] = await Promise.all([
    query
      .order("created_at", { ascending: false })
      .range(from, from + PAGE_SIZE - 1),
    db
      .from("categories")
      .select("id, name_ar, name_en")
      .eq("store_id", session.storeId)
      .order("display_order", { ascending: true }),
  ]);

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const canEdit = session.role !== "viewer";
  const hasFilters = Boolean(q || category || availability || status);

  const pageHref = (target: number) => {
    const next = new URLSearchParams();
    if (q) next.set("q", q);
    if (category) next.set("category", category);
    if (availability) next.set("availability", availability);
    if (status) next.set("status", status);
    if (target > 1) next.set("page", String(target));
    const qs = next.toString();
    return qs ? `/admin/products?${qs}` : "/admin/products";
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        {canEdit && (
          <Link href="/admin/products/new" className={buttonClass("primary")}>
            {t("add")}
          </Link>
        )}
      </div>

      {saved && (
        <p role="status" className="rounded-lg border border-border bg-background px-4 py-3 text-sm">
          {t(`notices.${saved}`)}
        </p>
      )}

      <form
        method="get"
        action="/admin/products"
        className="grid gap-3 rounded-2xl border border-border bg-background p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_auto]"
      >
        <TextField id="q" name="q" type="search" label={t("filters.search")} defaultValue={q} />
        <SelectField id="category" name="category" label={t("filters.category")} defaultValue={category}>
          <option value="">{t("filters.all")}</option>
          {(categories ?? []).map((row) => (
            <option key={row.id} value={row.id}>
              {pickLocalized(locale, row.name_ar, row.name_en)}
            </option>
          ))}
        </SelectField>
        <SelectField id="availability" name="availability" label={t("filters.availability")} defaultValue={availability}>
          <option value="">{t("filters.all")}</option>
          {AVAILABILITY.map((value) => (
            <option key={value} value={value}>
              {t(`availability.${value}`)}
            </option>
          ))}
        </SelectField>
        <SelectField id="status" name="status" label={t("filters.status")} defaultValue={status}>
          <option value="">{t("filters.all")}</option>
          <option value="active">{t("status.active")}</option>
          <option value="inactive">{t("status.inactive")}</option>
        </SelectField>
        <div className="flex items-end gap-2">
          <Button type="submit">{t("filters.apply")}</Button>
          {hasFilters && (
            <Link href="/admin/products" className={buttonClass("secondary")}>
              {t("filters.clear")}
            </Link>
          )}
        </div>
      </form>

      {error ? (
        <p role="alert" className="text-danger">
          {t("loadError")}
        </p>
      ) : products.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-background p-10 text-center">
          <p className="font-bold">{hasFilters ? t("noResults.title") : t("empty.title")}</p>
          <p className="mt-1 text-sm text-muted">
            {hasFilters ? t("noResults.body") : t("empty.body")}
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-border bg-background">
            <table className="w-full min-w-[56rem] text-sm">
              <thead className="border-b border-border text-muted">
                <tr>
                  {["name", "category", "brand", "price", "availability", "status", "created"].map((key) => (
                    <th key={key} scope="col" className="px-4 py-3 text-start font-medium">
                      {t(`columns.${key}`)}
                    </th>
                  ))}
                  {canEdit && (
                    <th scope="col" className="px-4 py-3 text-start font-medium">
                      {t("columns.actions")}
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <ProductThumb
                          url={product.product_images.find((image) => image.is_primary)?.public_url}
                        />
                        <div>
                      <div className="font-medium">
                        {pickLocalized(locale, product.name_ar, product.name_en)}
                        {product.featured && (
                          <span className="ms-2 rounded-full bg-violet-100 px-2 py-0.5 text-xs text-violet-800">
                            {t("featuredTag")}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted" dir="ltr">
                        {product.slug}
                      </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {product.categories
                        ? pickLocalized(locale, product.categories.name_ar, product.categories.name_en)
                        : "—"}
                    </td>
                    <td className="px-4 py-3">{product.brands?.name ?? "—"}</td>
                    <td className="px-4 py-3" dir="ltr">
                      {formatPrice(Number(product.price), store.currency_code, locale)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-xs font-medium",
                          AVAILABILITY_STYLE[product.availability],
                        )}
                      >
                        {t(`availability.${product.availability}`)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-xs font-medium",
                          product.active ? "bg-green-100 text-green-800" : "bg-surface text-muted",
                        )}
                      >
                        {t(product.active ? "status.active" : "status.inactive")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted">{formatDate(product.created_at, locale)}</td>
                    {canEdit && (
                      <td className="px-4 py-3">
                        <ProductRowActions
                          id={product.id}
                          name={pickLocalized(locale, product.name_ar, product.name_en)}
                          active={product.active}
                        />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <nav aria-label={t("pagination.label")} className="flex items-center justify-between gap-4 text-sm">
              <span className="text-muted">
                {t("pagination.summary", { page, totalPages, total })}
              </span>
              <div className="flex gap-2">
                {page > 1 ? (
                  <Link href={pageHref(page - 1)} className={buttonClass("secondary", "sm")}>
                    {t("pagination.previous")}
                  </Link>
                ) : null}
                {page < totalPages ? (
                  <Link href={pageHref(page + 1)} className={buttonClass("secondary", "sm")}>
                    {t("pagination.next")}
                  </Link>
                ) : null}
              </div>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
