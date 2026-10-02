"use client";

import Link from "next/link";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { OfferFormState } from "@/app/admin/(panel)/offers/actions";
import { Button, buttonClass } from "@/components/ui/button";
import { CheckboxField, TextField } from "@/components/ui/field";
import { SelectField } from "@/components/ui/select";
import { formatPrice } from "@/lib/format";
import { discountPercent } from "@/lib/offers";
import { useActionForm } from "@/lib/use-action-form";

export type OfferProductOption = { id: string; label: string; price: number };

export type OfferFormValues = {
  product_id: string;
  title_ar: string | null;
  title_en: string | null;
  old_price: number | null;
  new_price: number;
  /** "YYYY-MM-DDTHH:mm" in the store's time zone, or "" */
  start_at: string;
  end_at: string;
  active: boolean;
};

type OfferFormProps = {
  action: (prev: OfferFormState, formData: FormData) => Promise<OfferFormState>;
  products: OfferProductOption[];
  currency: string;
  timeZone: string;
  initial?: OfferFormValues;
  defaultProductId?: string;
};

function parseNumber(value: string): number | null {
  const compact = value.replace(/\s/g, "");
  const number = Number(compact.includes(".") ? compact.replace(/,/g, "") : compact.replace(",", "."));
  return compact !== "" && Number.isFinite(number) ? number : null;
}

export function OfferForm({ action, products, currency, timeZone, initial, defaultProductId }: OfferFormProps) {
  const t = useTranslations("admin.offers.form");
  const tc = useTranslations("admin.common");
  const locale = useLocale();
  const { state, onSubmit, onInput, isDismissed, pending } = useActionForm<OfferFormState>(action, {});

  const [productId, setProductId] = useState(initial?.product_id ?? defaultProductId ?? "");
  const [oldPrice, setOldPrice] = useState(initial?.old_price != null ? String(initial.old_price) : "");
  const [newPrice, setNewPrice] = useState(initial ? String(initial.new_price) : "");

  const error = (field: string) => {
    if (isDismissed(field)) return undefined;
    const code = state.fieldErrors?.[field];
    return code ? t(`errors.${code}`) : undefined;
  };

  // Live feedback: the old price defaults to the product's regular price.
  const product = products.find((item) => item.id === productId);
  const reference = parseNumber(oldPrice) ?? product?.price ?? null;
  const offer = parseNumber(newPrice);
  const percent = reference !== null && offer !== null ? discountPercent(reference, offer) : null;
  const notCheaper = reference !== null && offer !== null && percent === null;

  return (
    <form onSubmit={onSubmit} onInput={onInput} className="flex max-w-2xl flex-col gap-5" noValidate>
      <SelectField
        id="product_id"
        name="product_id"
        label={t("product")}
        value={productId}
        onChange={(event) => setProductId(event.target.value)}
        required
        error={error("product_id")}
      >
        <option value="" disabled>
          {t("productPlaceholder")}
        </option>
        {products.map((item) => (
          <option key={item.id} value={item.id}>
            {item.label} — {formatPrice(item.price, currency, locale)}
          </option>
        ))}
      </SelectField>

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          id="title_ar"
          name="title_ar"
          label={t("titleAr")}
          hint={t("titleHint")}
          defaultValue={initial?.title_ar ?? ""}
          error={error("title_ar")}
        />
        <TextField
          id="title_en"
          name="title_en"
          label={t("titleEn")}
          dir="ltr"
          defaultValue={initial?.title_en ?? ""}
          error={error("title_en")}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          id="old_price"
          name="old_price"
          label={t("oldPrice", { currency })}
          hint={product ? t("oldPriceHint", { price: formatPrice(product.price, currency, locale) }) : t("oldPriceHintNoProduct")}
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          dir="ltr"
          value={oldPrice}
          onChange={(event) => setOldPrice(event.target.value)}
          error={error("old_price")}
        />
        <TextField
          id="new_price"
          name="new_price"
          label={t("newPrice", { currency })}
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          dir="ltr"
          value={newPrice}
          onChange={(event) => setNewPrice(event.target.value)}
          required
          error={error("new_price")}
        />
      </div>

      {percent !== null && (
        <p role="status" className="text-sm font-medium text-green-700">
          {t("discountPreview", { percent })}
        </p>
      )}
      {notCheaper && !error("new_price") && (
        <p role="status" className="text-sm text-danger">
          {t("notCheaperPreview")}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          id="start_at"
          name="start_at"
          label={t("startAt")}
          hint={t("startAtHint")}
          type="datetime-local"
          dir="ltr"
          defaultValue={initial?.start_at ?? ""}
          error={error("start_at")}
        />
        <TextField
          id="end_at"
          name="end_at"
          label={t("endAt")}
          hint={t("endAtHint")}
          type="datetime-local"
          dir="ltr"
          defaultValue={initial?.end_at ?? ""}
          error={error("end_at")}
        />
      </div>
      <p className="-mt-2 text-xs text-muted">{t("timeZoneHint", { timeZone })}</p>

      <CheckboxField
        id="active"
        name="active"
        label={t("active")}
        hint={t("activeHint")}
        defaultChecked={initial?.active ?? true}
      />

      {state.formError && (
        <p role="alert" className="text-sm text-danger">
          {t("saveFailed")}
        </p>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? tc("saving") : tc("save")}
        </Button>
        <Link href="/admin/offers" className={buttonClass("secondary")}>
          {tc("cancel")}
        </Link>
      </div>
    </form>
  );
}
