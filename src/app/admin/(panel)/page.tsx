import { getTranslations } from "next-intl/server";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function AdminDashboardPage() {
  const session = await requireAdmin();
  const t = await getTranslations("admin.dashboard");
  const supabase = await createClient();
  const now = new Date().toISOString();

  const [activeProducts, outOfStock, onSale] = await Promise.all([
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("store_id", session.storeId)
      .eq("active", true),
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("store_id", session.storeId)
      .eq("active", true)
      .eq("availability", "out_of_stock"),
    // An offer counts as live inside its optional start/end window.
    supabase
      .from("offers")
      .select("id", { count: "exact", head: true })
      .eq("store_id", session.storeId)
      .eq("active", true)
      .or(`start_at.is.null,start_at.lte.${now}`)
      .or(`end_at.is.null,end_at.gt.${now}`),
  ]);

  const failed = [activeProducts, outOfStock, onSale].some((r) => r.error);
  const stats = [
    { label: t("stats.activeProducts"), value: activeProducts.count },
    { label: t("stats.onSale"), value: onSale.count },
    { label: t("stats.outOfStock"), value: outOfStock.count },
  ];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">
        {t("welcome", { name: session.displayName ?? session.email ?? "" })}
      </h1>

      {failed ? (
        <p role="alert" className="text-danger">
          {t("loadError")}
        </p>
      ) : (
        <dl className="grid gap-4 sm:grid-cols-3">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-border bg-background p-5"
            >
              <dt className="text-sm text-muted">{stat.label}</dt>
              <dd className="mt-1 text-3xl font-bold">{stat.value ?? 0}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
