import { getTranslations } from "next-intl/server";
import { AppearanceForm } from "@/components/admin/appearance-form";
import { resolveTheme } from "@/config/theme";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { saveAppearance } from "./actions";

export default async function AdminAppearancePage() {
  const [session, t] = await Promise.all([requireAdmin(), getTranslations("admin.appearance")]);
  const db = await createClient();

  const [{ data: theme }, { data: store }] = await Promise.all([
    db
      .from("store_theme")
      .select("preset, primary_color, secondary_color, accent_color, surface_color, text_color, font_key, radius")
      .eq("store_id", session.storeId)
      .maybeSingle(),
    db.from("stores").select("name, logo_url").eq("id", session.storeId).maybeSingle(),
  ]);

  const resolved = resolveTheme(theme);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted">{t("intro")}</p>
      </div>
      <AppearanceForm
        action={saveAppearance}
        readOnly={session.role === "viewer"}
        storeName={store?.name ?? ""}
        logoUrl={store?.logo_url ?? null}
        initial={{
          preset: resolved.preset,
          primary_color: resolved.colors.primary,
          secondary_color: resolved.colors.secondary,
          accent_color: resolved.colors.accent,
          surface_color: resolved.colors.surface,
          text_color: resolved.colors.text,
          font_key: resolved.font,
          radius: resolved.radius,
        }}
      />
    </div>
  );
}
