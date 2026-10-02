import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { publicEnv } from "@/config/env";
import type { Database } from "@/types/database.types";

/**
 * Cookie-less anonymous client for public storefront reads. Because it never
 * touches request cookies, pages that use it can be cached/static.
 * RLS still applies: it only sees active public content.
 */
export function createPublicClient() {
  return createSupabaseClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
