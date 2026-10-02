import { cache } from "react";
import { getStoreSlug } from "@/config/env";
import { createPublicClient } from "@/lib/supabase/public";

/** The store this deployment serves, resolved once per request. */
export const getCurrentStore = cache(async () => {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("stores")
    .select("id, name, slug, currency_code, locale_default, timezone, logo_url")
    .eq("slug", getStoreSlug())
    .maybeSingle();

  if (error) throw new Error(`Failed to load store: ${error.message}`);
  if (!data) throw new Error(`Store "${getStoreSlug()}" not found`);
  return data;
});
