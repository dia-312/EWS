"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { MAX_COMPARE } from "@/lib/shop-state";
import { useShopStore } from "@/lib/shop-store";

/** A short, visible message when an action was refused (for now: the comparison list is full). */
export function ShopToast() {
  const t = useTranslations("store.shop");
  const notice = useShopStore((state) => state.notice);
  const clear = useShopStore((state) => state.clearNotice);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(clear, 4000);
    return () => clearTimeout(timer);
  }, [notice, clear]);

  if (!notice) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-20 z-50 mx-auto w-fit max-w-full rounded-xl bg-secondary px-4 py-3 text-sm font-medium text-secondary-foreground shadow-lg"
    >
      {t("compareFull", { max: MAX_COMPARE })}
    </div>
  );
}
