"use client";

import { useEffect } from "react";
import { SHOP_STORAGE_KEY, useShopStore } from "@/lib/shop-store";

/**
 * Loads the favourites and comparison list from the browser once the page has
 * hydrated, and keeps open tabs in sync when another tab changes them.
 */
export function ShopHydrator() {
  useEffect(() => {
    const load = async () => {
      await useShopStore.persist.rehydrate();
      useShopStore.setState({ hydrated: true });
    };
    void load();

    const onStorage = (event: StorageEvent) => {
      if (event.key === SHOP_STORAGE_KEY) void useShopStore.persist.rehydrate();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return null;
}
