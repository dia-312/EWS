"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { EmptyState } from "@/components/storefront/empty-state";
import { ProductGrid } from "@/components/storefront/product-grid";
import { Button, buttonClass } from "@/components/ui/button";
import type { Locale } from "@/config/i18n";
import { Link } from "@/i18n/navigation";
import type { CatalogItem } from "@/lib/catalog";
import { pruneIds } from "@/lib/shop-state";
import { useShopStore } from "@/lib/shop-store";

type Status = "loading" | "ready" | "error";

/**
 * The visitor's saved products. The ids live in this browser only, so the page
 * asks the public API for the matching cards, then forgets ids that no longer
 * exist (products that were hidden or deleted since they were saved).
 */
export function FavoritesView() {
  const t = useTranslations("store.favorites");
  const locale = useLocale() as Locale;
  const hydrated = useShopStore((state) => state.hydrated);
  const favorites = useShopStore((state) => state.favorites);
  const setFavorites = useShopStore((state) => state.setFavorites);

  const [items, setItems] = useState<CatalogItem[]>([]);
  const [currency, setCurrency] = useState("ILS");
  const [status, setStatus] = useState<Status>("loading");
  const [attempt, setAttempt] = useState(0);
  const loadedFor = useRef("");

  const load = useCallback(
    async (ids: string[], signal: AbortSignal) => {
      try {
        const response = await fetch(`/api/products?ids=${ids.join(",")}&locale=${locale}`, { signal });
        if (!response.ok) throw new Error(String(response.status));
        const data = (await response.json()) as { items: CatalogItem[]; currency?: string };

        setItems(data.items);
        if (data.currency) setCurrency(data.currency);
        setStatus("ready");

        // Forget saved products that no longer exist.
        const known = new Set(data.items.map((item) => item.id));
        const kept = pruneIds(ids, known);
        if (kept.length !== ids.length) setFavorites(kept);
      } catch (error) {
        if ((error as Error).name !== "AbortError") setStatus("error");
      }
    },
    [locale, setFavorites],
  );

  const missing = useMemo(
    () => favorites.filter((id) => !items.some((item) => item.id === id)),
    [favorites, items],
  );

  useEffect(() => {
    if (!hydrated) return;
    if (favorites.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- nothing to load: show the empty state
      setStatus("ready");
      return;
    }
    // Only ask the server when there is something new to show.
    const key = `${attempt}:${missing.join(",")}`;
    if (missing.length === 0 || loadedFor.current === key) return;
    loadedFor.current = key;

    const controller = new AbortController();
    setStatus((current) => (current === "ready" && items.length > 0 ? current : "loading"));
    void load(favorites, controller.signal);
    return () => controller.abort();
  }, [hydrated, favorites, missing, attempt, items.length, load]);

  // Newest first, and only what is still saved (the heart on a card removes it at once).
  const shown = [...favorites]
    .reverse()
    .map((id) => items.find((item) => item.id === id))
    .filter((item): item is CatalogItem => Boolean(item));

  if (!hydrated || status === "loading") {
    return (
      <div aria-busy="true" aria-label={t("loading")} className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: Math.min(Math.max(favorites.length, 4), 8) }, (_, index) => (
          <div key={index} className="aspect-[3/4] animate-pulse rounded-xl border border-border bg-background" />
        ))}
      </div>
    );
  }

  if (status === "error") {
    return (
      <EmptyState title={t("error.title")} body={t("error.body")}>
        <Button
          onClick={() => {
            setStatus("loading");
            setAttempt((value) => value + 1);
          }}
        >
          {t("error.retry")}
        </Button>
      </EmptyState>
    );
  }

  if (shown.length === 0) {
    return (
      <EmptyState title={t("empty.title")} body={t("empty.body")}>
        <Link href="/products" className={buttonClass("primary")}>
          {t("empty.browse")}
        </Link>
      </EmptyState>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p role="status" className="text-sm text-muted">
          {t("count", { count: shown.length })}
        </p>
        <Button variant="secondary" size="sm" onClick={() => setFavorites([])}>
          {t("clear")}
        </Button>
      </div>
      <ProductGrid items={shown} locale={locale} currency={currency} />
    </div>
  );
}
