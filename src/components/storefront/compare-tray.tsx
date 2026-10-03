"use client";

import { useTranslations } from "next-intl";
import { buttonClass } from "@/components/ui/button";
import { Link, usePathname } from "@/i18n/navigation";
import { MAX_COMPARE, compareHref } from "@/lib/shop-state";
import { useShopStore } from "@/lib/shop-store";

/** Floating bar that shows what is selected for comparison and leads to the comparison page. */
export function CompareTray() {
  const t = useTranslations("store.shop");
  const pathname = usePathname();
  const compare = useShopStore((state) => (state.hydrated ? state.compare : []));
  const clear = useShopStore((state) => state.clearCompare);

  // The comparison page has its own controls.
  if (compare.length === 0 || pathname.startsWith("/compare")) return null;
  const ready = compare.length >= 2;

  return (
    <aside
      aria-label={t("trayLabel")}
      className="fixed bottom-4 start-4 z-40 flex max-w-[calc(100%-6rem)] flex-wrap items-center gap-2 rounded-2xl border border-border bg-background p-2 ps-4 shadow-lg sm:max-w-none"
    >
      <span className="text-sm font-medium" role="status">
        {t("selected", { count: compare.length, max: MAX_COMPARE })}
      </span>
      {ready ? (
        <Link href={compareHref(compare)} className={buttonClass("primary", "sm")}>
          {t("compareNow")}
        </Link>
      ) : (
        <span className="text-xs text-muted">{t("addOneMore")}</span>
      )}
      <button
        type="button"
        onClick={clear}
        className="rounded-lg px-2 py-1 text-sm text-muted underline underline-offset-2 hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary"
      >
        {t("clear")}
      </button>
    </aside>
  );
}
