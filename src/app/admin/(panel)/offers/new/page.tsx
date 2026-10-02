import { getLocale, getTranslations } from "next-intl/server";
import { OfferForm } from "@/components/admin/offer-form";
import { requireEditor } from "@/lib/auth";
import { getCurrentStore } from "@/lib/store";
import { createOffer } from "../actions";
import { loadOfferProductOptions } from "../options";

export default async function NewOfferPage({ searchParams }: PageProps<"/admin/offers/new">) {
  const session = await requireEditor();
  const [locale, t, store, params] = await Promise.all([
    getLocale(),
    getTranslations("admin.offers.form"),
    getCurrentStore(),
    searchParams,
  ]);
  const products = await loadOfferProductOptions(session.storeId, locale);

  const requested = Array.isArray(params.product) ? params.product[0] : params.product;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">{t("newTitle")}</h1>
      <OfferForm
        action={createOffer}
        products={products}
        currency={store.currency_code}
        timeZone={store.timezone}
        defaultProductId={products.some((product) => product.id === requested) ? requested : undefined}
      />
    </div>
  );
}
