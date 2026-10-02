import { cache } from "react";
import { getCategories, getStoreSettings } from "@/lib/catalog";
import { getCurrentStore } from "@/lib/store";

/** Store, contact settings and categories: what every public page needs, loaded once per request. */
export const getStorefront = cache(async () => {
  const store = await getCurrentStore();
  const [settings, categories] = await Promise.all([
    getStoreSettings(store.id),
    getCategories(store.id),
  ]);
  return { store, settings, categories };
});
