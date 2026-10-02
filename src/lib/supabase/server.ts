import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { publicEnv } from "@/config/env";
import type { Database } from "@/types/database.types";

/**
 * Server client bound to the request's session cookies. Use it in admin pages,
 * server actions and route handlers where the signed-in admin matters.
 * Reading cookies makes the calling route dynamic.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component: cookies are read-only there.
            // Session refresh happens in the proxy/middleware or server actions.
          }
        },
      },
    },
  );
}
