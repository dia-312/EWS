import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { OfferForm } from "@/components/admin/offer-form";
import { SiteImageField } from "@/components/admin/site-image-field";
import { requireEditor } from "@/lib/auth";
import { getCurrentStore } from "@/lib/store";
import { createClient } from "@/lib/supabase/server";
import { utcToZonedInput } from "@/lib/timezone";
import { updateOffer } from "../actions";
import { loadOfferProductOptions } from "../options";

export default async function EditOfferPage({ params }: PageProps<"/admin/offers/[id]">) {
  const [session, { id }, locale, t, store] = await Promise.all([
    requireEditor(),
    params,
    getLocale(),
    getTranslations("admin.offers.form"),
    getCurrentStore(),
  ]);

  const db = await createClient();
  const [{ data: offer }, products] = await Promise.all([
    db
      .from("offers")
      .select("product_id, title_ar, title_en, old_price, new_price, start_at, end_at, active, banner_image_url")
      .eq("id", id)
      .eq("store_id", session.storeId)
      .maybeSingle(),
    loadOfferProductOptions(session.storeId, locale),
  ]);
  if (!offer) notFound();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">{t("editTitle")}</h1>
      <SiteImageField
        storeId={session.storeId}
        target={{ kind: "offer", id }}
        imageUrl={offer.banner_image_url}
        title={t("banner.title")}
        hint={t("banner.hint")}
        aspect="16 / 5"
      />
      <OfferForm
        action={updateOffer.bind(null, id)}
        products={products}
        currency={store.currency_code}
        timeZone={store.timezone}
        initial={{
          product_id: offer.product_id,
          title_ar: offer.title_ar,
          title_en: offer.title_en,
          old_price: offer.old_price === null ? null : Number(offer.old_price),
          new_price: Number(offer.new_price),
          start_at: offer.start_at ? utcToZonedInput(offer.start_at, store.timezone) : "",
          end_at: offer.end_at ? utcToZonedInput(offer.end_at, store.timezone) : "",
          active: offer.active,
        }}
      />
    </div>
  );
}
