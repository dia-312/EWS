import { getStoreSlug } from "@/config/env";
import { createPublicClient } from "@/lib/supabase/public";

export const dynamic = "force-dynamic";

/**
 * Is the site able to reach its database? One tiny query, never cached.
 * Also what the scheduled keep-alive calls (see worker.ts), which keeps the
 * free Supabase project from being paused for inactivity.
 *
 *   GET /api/health  ->  200 { "ok": true }  |  503 { "ok": false }
 */
export async function GET() {
  const headers = { "Cache-Control": "no-store" };
  try {
    const { data, error } = await createPublicClient()
      .from("stores")
      .select("id")
      .eq("slug", getStoreSlug())
      .maybeSingle();
    if (error || !data) return Response.json({ ok: false }, { status: 503, headers });
    return Response.json({ ok: true }, { headers });
  } catch {
    return Response.json({ ok: false }, { status: 503, headers });
  }
}
