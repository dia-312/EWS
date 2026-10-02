"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import type { ProductFormState } from "@/app/admin/(panel)/products/actions";
import { SpecEditor, type SpecRowValue } from "@/components/admin/spec-editor";
import { Button, buttonClass } from "@/components/ui/button";
import { CheckboxField, TextareaField, TextField } from "@/components/ui/field";
import { SelectField } from "@/components/ui/select";
import { slugify } from "@/lib/slug";
import { AVAILABILITY } from "@/lib/validations/product";

export type ProductFormValues = {
  name_ar: string;
  name_en: string | null;
  slug: string;
  category_id: string;
  brand_id: string | null;
  price: number;
  availability: string;
  short_description_ar: string | null;
  short_description_en: string | null;
  description_ar: string | null;
  description_en: string | null;
  active: boolean;
  featured: boolean;
  bestseller_manual: boolean;
  is_new_override: boolean | null;
  sort_order: number;
  search_aliases: string[];
  specs: SpecRowValue[];
  badge_ids: string[];
};

type Option = { id: string; label: string };

type ProductFormProps = {
  action: (prev: ProductFormState, formData: FormData) => Promise<ProductFormState>;
  categories: Option[];
  brands: Option[];
  badges: Option[];
  currency: string;
  initial?: ProductFormValues;
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-border bg-background p-5">
      <h2 className="text-base font-bold">{title}</h2>
      {children}
    </section>
  );
}

export function ProductForm({
  action,
  categories,
  brands,
  badges,
  currency,
  initial,
}: ProductFormProps) {
  const t = useTranslations("admin.products.form");
  const tc = useTranslations("admin.common");
  const [state, formAction, pending] = useActionState<ProductFormState, FormData>(
    action,
    {},
  );

  // For a new product the slug follows the English name until it is edited by hand.
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(initial));

  const error = (field: string) => {
    const code = state.fieldErrors?.[field];
    return code ? t(`errors.${code}`) : undefined;
  };

  const newOverride =
    initial?.is_new_override === true ? "yes" : initial?.is_new_override === false ? "no" : "auto";

  return (
    <form action={formAction} className="flex max-w-3xl flex-col gap-5" noValidate>
      <Section title={t("sections.basic")}>
        <TextField
          id="name_ar"
          name="name_ar"
          label={t("nameAr")}
          defaultValue={initial?.name_ar}
          required
          error={error("name_ar")}
        />
        <TextField
          id="name_en"
          name="name_en"
          label={t("nameEn")}
          hint={t("nameEnHint")}
          dir="ltr"
          defaultValue={initial?.name_en ?? ""}
          error={error("name_en")}
          onChange={(event) => {
            if (!slugTouched) setSlug(slugify(event.target.value));
          }}
        />
        <TextField
          id="slug"
          name="slug"
          label={t("slug")}
          hint={t("slugHint")}
          dir="ltr"
          value={slug}
          onChange={(event) => {
            setSlugTouched(true);
            setSlug(event.target.value);
          }}
          required
          error={error("slug")}
        />
        <SelectField
          id="category_id"
          name="category_id"
          label={t("category")}
          defaultValue={initial?.category_id ?? ""}
          required
          error={error("category_id")}
        >
          <option value="" disabled>
            {t("categoryPlaceholder")}
          </option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.label}
            </option>
          ))}
        </SelectField>
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            id="brand_id"
            name="brand_id"
            label={t("brand")}
            defaultValue={initial?.brand_id ?? ""}
            error={error("brand_id")}
          >
            <option value="">{t("brandNone")}</option>
            {brands.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.label}
              </option>
            ))}
          </SelectField>
          <TextField
            id="new_brand"
            name="new_brand"
            label={t("newBrand")}
            hint={t("newBrandHint")}
            error={error("new_brand")}
          />
        </div>
      </Section>

      <Section title={t("sections.pricing")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            id="price"
            name="price"
            label={t("price", { currency })}
            hint={t("priceHint")}
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            dir="ltr"
            defaultValue={initial?.price}
            required
            error={error("price")}
          />
          <SelectField
            id="availability"
            name="availability"
            label={t("availability")}
            defaultValue={initial?.availability ?? "in_stock"}
            error={error("availability")}
          >
            {AVAILABILITY.map((value) => (
              <option key={value} value={value}>
                {t(`availabilityOptions.${value}`)}
              </option>
            ))}
          </SelectField>
        </div>
      </Section>

      <Section title={t("sections.descriptions")}>
        <TextareaField
          id="short_description_ar"
          name="short_description_ar"
          label={t("shortDescriptionAr")}
          defaultValue={initial?.short_description_ar ?? ""}
          error={error("short_description_ar")}
        />
        <TextareaField
          id="short_description_en"
          name="short_description_en"
          label={t("shortDescriptionEn")}
          dir="ltr"
          defaultValue={initial?.short_description_en ?? ""}
          error={error("short_description_en")}
        />
        <TextareaField
          id="description_ar"
          name="description_ar"
          label={t("descriptionAr")}
          rows={6}
          defaultValue={initial?.description_ar ?? ""}
          error={error("description_ar")}
        />
        <TextareaField
          id="description_en"
          name="description_en"
          label={t("descriptionEn")}
          rows={6}
          dir="ltr"
          defaultValue={initial?.description_en ?? ""}
          error={error("description_en")}
        />
      </Section>

      <Section title={t("sections.specs")}>
        <SpecEditor initial={initial?.specs ?? []} error={error("specs")} />
      </Section>

      <Section title={t("sections.display")}>
        <CheckboxField
          id="active"
          name="active"
          label={t("active")}
          hint={t("activeHint")}
          defaultChecked={initial?.active ?? true}
        />
        <CheckboxField
          id="featured"
          name="featured"
          label={t("featured")}
          hint={t("featuredHint")}
          defaultChecked={initial?.featured ?? false}
        />
        <CheckboxField
          id="bestseller_manual"
          name="bestseller_manual"
          label={t("bestseller")}
          hint={t("bestsellerHint")}
          defaultChecked={initial?.bestseller_manual ?? false}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            id="is_new_override"
            name="is_new_override"
            label={t("newOverride")}
            hint={t("newOverrideHint")}
            defaultValue={newOverride}
          >
            <option value="auto">{t("newOverrideOptions.auto")}</option>
            <option value="yes">{t("newOverrideOptions.yes")}</option>
            <option value="no">{t("newOverrideOptions.no")}</option>
          </SelectField>
          <TextField
            id="sort_order"
            name="sort_order"
            label={t("sortOrder")}
            hint={t("sortOrderHint")}
            type="number"
            step="1"
            dir="ltr"
            defaultValue={initial?.sort_order ?? 0}
            error={error("sort_order")}
          />
        </div>

        {badges.length > 0 && (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-medium">{t("badges")}</legend>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {badges.map((badge) => (
                <label key={badge.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="badge_ids"
                    value={badge.id}
                    defaultChecked={initial?.badge_ids.includes(badge.id)}
                    className="size-4 accent-primary"
                  />
                  {badge.label}
                </label>
              ))}
            </div>
          </fieldset>
        )}
      </Section>

      <Section title={t("sections.search")}>
        <TextareaField
          id="search_aliases"
          name="search_aliases"
          label={t("aliases")}
          hint={t("aliasesHint")}
          defaultValue={initial?.search_aliases.join("\n") ?? ""}
          error={error("search_aliases")}
        />
      </Section>

      {state.formError && (
        <p role="alert" className="text-sm text-danger">
          {t("saveFailed")}
        </p>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? tc("saving") : tc("save")}
        </Button>
        <Link href="/admin/products" className={buttonClass("secondary")}>
          {tc("cancel")}
        </Link>
      </div>
    </form>
  );
}
