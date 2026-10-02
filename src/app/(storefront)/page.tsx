import { getCurrentStore } from "@/lib/store";
import { createPublicClient } from "@/lib/supabase/public";

// Temporary smoke-test page: proves the deployed app can reach Supabase.
// Rendered per request on purpose so the hosting CPU limits get exercised.
export const dynamic = "force-dynamic";

export default async function Home() {
  const store = await getCurrentStore();
  const { count } = await createPublicClient()
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("store_id", store.id);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-2 p-8">
      <h1 className="text-3xl font-semibold">{store.name}</h1>
      <p>
        {store.currency_code} · {store.locale_default} · {count ?? 0} products
      </p>
    </main>
  );
}
