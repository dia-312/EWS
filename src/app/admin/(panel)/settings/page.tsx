import { getTranslations } from "next-intl/server";
import { SettingsForm } from "@/components/admin/settings-form";
import { SiteImageField } from "@/components/admin/site-image-field";
import { StoreLogo } from "@/components/admin/store-logo";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { parseWorkingHours } from "@/lib/working-hours";
import { saveSettings } from "./actions";

export default async function AdminSettingsPage() {
  const [session, t] = await Promise.all([requireAdmin(), getTranslations("admin.settings")]);
  const db = await createClient();

  const [{ data: store }, { data: settings }] = await Promise.all([
    db
      .from("stores")
      .select("name, logo_url, currency_code, locale_default, timezone")
      .eq("id", session.storeId)
      .maybeSingle(),
    db.from("store_settings").select("*").eq("store_id", session.storeId).maybeSingle(),
  ]);

  if (!store) {
    return (
      <p role="alert" className="text-danger">
        {t("loadError")}
      </p>
    );
  }

  const readOnly = session.role === "viewer";

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      {!readOnly && (
        <StoreLogo storeId={session.storeId} storeName={store.name} logoUrl={store.logo_url} />
      )}
      {!readOnly && (
        <SiteImageField
          storeId={session.storeId}
          target={{ kind: "hero" }}
          imageUrl={settings?.hero_image_url ?? null}
          title={t("hero.title")}
          hint={t("hero.hint")}
          aspect="16 / 6"
        />
      )}
      <SettingsForm
        action={saveSettings}
        readOnly={readOnly}
        initial={{
          ...store,
          phone: settings?.phone ?? null,
          whatsapp: settings?.whatsapp ?? null,
          instagram_url: settings?.instagram_url ?? null,
          facebook_url: settings?.facebook_url ?? null,
          map_url: settings?.map_url ?? null,
          address_ar: settings?.address_ar ?? null,
          address_en: settings?.address_en ?? null,
          about_text_ar: settings?.about_text_ar ?? null,
          about_text_en: settings?.about_text_en ?? null,
          seo_title: settings?.seo_title ?? null,
          seo_description: settings?.seo_description ?? null,
          working_hours: parseWorkingHours(settings?.working_hours),
        }}
      />
    </div>
  );
}
