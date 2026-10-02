// Temporary diagnostics endpoint. Reports configuration presence (never values)
// and the first failure it hits. Remove once deployment is verified.
export const dynamic = "force-dynamic";

export async function GET() {
  const started = Date.now();
  const report: Record<string, unknown> = {
    env: {
      STORE_SLUG: Boolean(process.env.STORE_SLUG),
      NEXT_PUBLIC_SUPABASE_URL: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      NEXT_PUBLIC_SUPABASE_ANON_KEY: Boolean(
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      ),
    },
  };

  try {
    // Names only, never values: which variables does this Worker actually see?
    report.processEnvNames = Object.keys(process.env)
      .filter((k) => !k.startsWith("npm_"))
      .sort();
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    report.bindingNames = Object.keys(getCloudflareContext().env ?? {}).sort();
  } catch (err) {
    report.contextError = err instanceof Error ? err.message : String(err);
  }

  try {
    const { getCurrentStore } = await import("@/lib/store");
    const store = await getCurrentStore();
    report.store = { name: store.name, slug: store.slug };
    report.ok = true;
  } catch (err) {
    report.ok = false;
    report.error =
      err instanceof Error
        ? { name: err.name, message: err.message, stack: err.stack?.split("\n").slice(0, 6) }
        : String(err);
  }

  report.elapsedMs = Date.now() - started;
  return Response.json(report, { status: report.ok ? 200 : 500 });
}
