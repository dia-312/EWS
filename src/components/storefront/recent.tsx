"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ProductGrid } from "@/components/storefront/product-grid";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/config/i18n";
import type { CatalogItem } from "@/lib/catalog";
import { useShopStore } from "@/lib/shop-store";

/** Remembers that this visitor looked at a product (kept in the browser only). */
export function RecordView({ productId }: { productId: string }) {
  const hydrated = useShopStore((state) => state.hydrated);
  const addRecent = useShopStore((state) => state.addRecent);

  useEffect(() => {
    if (hydrated) addRecent(productId);
  }, [hydrated, productId, addRecent]);

  return null;
}

const SHOWN = 6;

/**
 * The products the visitor looked at last. Nothing is shown (not even a
 * heading) until there is something to show, and products that no longer exist
 * are forgotten.
 */
export function RecentlyViewed({ excludeId }: { excludeId?: string }) {
  const t = useTranslations("store.recent");
  const locale = useLocale() as Locale;
  const hydrated = useShopStore((state) => state.hydrated);
  const recent = useShopStore((state) => state.recent);
  const setRecent = useShopStore((state) => state.setRecent);
  const clearRecent = useShopStore((state) => state.clearRecent);

  const [items, setItems] = useState<CatalogItem[]>([]);
  const [currency, setCurrency] = useState("ILS");

  const wanted = recent.filter((id) => id !== excludeId).slice(0, SHOWN);
  const key = wanted.join(",");

  useEffect(() => {
    if (!hydrated || key === "") return;
    const controller = new AbortController();

    fetch(`/api/products?ids=${key}&locale=${locale}`, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error(String(response.status)))))
      .then((data: { items: CatalogItem[]; currency?: string }) => {
        setItems(data.items);
        if (data.currency) setCurrency(data.currency);

        // Forget products that were hidden or deleted since they were viewed.
        const known = new Set(data.items.map((item) => item.id));
        const current = useShopStore.getState().recent;
        const kept = current.filter((id) => id === excludeId || known.has(id) || !key.split(",").includes(id));
        if (kept.length !== current.length) setRecent(kept);
      })
      .catch(() => {
        /* a missing "recently viewed" row is not worth an error message */
      });

    return () => controller.abort();
  }, [hydrated, key, locale, excludeId, setRecent]);

  // Newest first, and only what is still in the saved list.
  const shown = wanted
    .map((id) => items.find((item) => item.id === id))
    .filter((item): item is CatalogItem => Boolean(item));

  if (!hydrated || shown.length === 0) return null;

  return (
    <section aria-labelledby="recent-title" className="flex flex-col gap-4" data-recently-viewed>
      <div className="flex items-end justify-between gap-3">
        <h2 id="recent-title" className="section-title">
          {t("title")}
        </h2>
        <Button variant="ghost" size="sm" onClick={clearRecent}>
          {t("clear")}
        </Button>
      </div>
      <ProductGrid items={shown} locale={locale} currency={currency} />
    </section>
  );
}
