"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/storefront/empty-state";
import { Button, buttonClass } from "@/components/ui/button";
import { Link, useRouter } from "@/i18n/navigation";
import { compareHref } from "@/lib/shop-state";
import { useShopStore } from "@/lib/shop-store";

/** Takes one product out of the comparison and reloads the page with the remaining ones. */
export function CompareRemoveButton({
  productId,
  remainingIds,
  productName,
}: {
  productId: string;
  remainingIds: string[];
  productName: string;
}) {
  const t = useTranslations("store.compare");
  const router = useRouter();
  const removeCompare = useShopStore((state) => state.removeCompare);

  return (
    <Button
      variant="ghost"
      size="sm"
      aria-label={t("remove", { name: productName })}
      onClick={() => {
        removeCompare(productId);
        router.replace(compareHref(remainingIds));
      }}
    >
      {t("removeShort")}
    </Button>
  );
}

/**
 * Shown when the comparison page is opened without ids: use the list saved in
 * this browser if there is one (so "Compare" always works), otherwise explain.
 */
export function CompareFallback() {
  const t = useTranslations("store.compare");
  const router = useRouter();
  const hydrated = useShopStore((state) => state.hydrated);
  const compare = useShopStore((state) => state.compare);

  useEffect(() => {
    if (hydrated && compare.length > 0) router.replace(compareHref(compare));
  }, [hydrated, compare, router]);

  if (!hydrated || compare.length > 0) {
    return <p role="status" className="text-sm text-muted">{t("loading")}</p>;
  }

  return (
    <EmptyState title={t("empty.title")} body={t("empty.body", { max: 4 })}>
      <Link href="/products" className={buttonClass("primary")}>
        {t("empty.browse")}
      </Link>
    </EmptyState>
  );
}
