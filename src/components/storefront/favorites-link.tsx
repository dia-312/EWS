"use client";

import { useTranslations } from "next-intl";
import { HeartIcon } from "@/components/storefront/icons";
import { Link } from "@/i18n/navigation";
import { useShopStore } from "@/lib/shop-store";

/** Header link to the saved products, with how many there are. */
export function FavoritesLink() {
  const t = useTranslations("store.shop");
  const count = useShopStore((state) => (state.hydrated ? state.favorites.length : 0));

  return (
    <Link
      href="/favorites"
      aria-label={count > 0 ? t("favoritesWithCount", { count }) : t("favorites")}
      className="relative inline-flex size-9 items-center justify-center rounded-full border border-border transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-primary"
    >
      <HeartIcon className="size-5" filled={count > 0} />
      {count > 0 && (
        <span
          data-favorites-count
          className="absolute -end-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-danger px-1 text-xs font-bold leading-5 text-white"
        >
          {count}
        </span>
      )}
    </Link>
  );
}
