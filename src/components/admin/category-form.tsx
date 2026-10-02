"use client";

import Link from "next/link";
import { useState } from "react";
import { useTranslations } from "next-intl";
import type { CategoryFormState } from "@/app/admin/(panel)/categories/actions";
import { Button, buttonClass } from "@/components/ui/button";
import { CheckboxField, TextareaField, TextField } from "@/components/ui/field";
import { slugify } from "@/lib/slug";
import { useActionForm } from "@/lib/use-action-form";

export type CategoryFormValues = {
  name_ar: string;
  name_en: string | null;
  slug: string;
  description_ar: string | null;
  description_en: string | null;
  icon: string | null;
  active: boolean;
};

type CategoryFormProps = {
  action: (
    prev: CategoryFormState,
    formData: FormData,
  ) => Promise<CategoryFormState>;
  initial?: CategoryFormValues;
};

export function CategoryForm({ action, initial }: CategoryFormProps) {
  const t = useTranslations("admin.categories.form");
  const tc = useTranslations("admin.common");
  const { state, onSubmit, pending } = useActionForm<CategoryFormState>(action, {});

  // For a new category the slug follows the English name until it is edited by hand.
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(initial));

  const error = (field: string) => {
    const code = state.fieldErrors?.[field];
    return code ? t(`errors.${code}`) : undefined;
  };

  return (
    <form onSubmit={onSubmit} className="flex max-w-2xl flex-col gap-5" noValidate>
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

      <TextareaField
        id="description_ar"
        name="description_ar"
        label={t("descriptionAr")}
        defaultValue={initial?.description_ar ?? ""}
        error={error("description_ar")}
      />

      <TextareaField
        id="description_en"
        name="description_en"
        label={t("descriptionEn")}
        dir="ltr"
        defaultValue={initial?.description_en ?? ""}
        error={error("description_en")}
      />

      <TextField
        id="icon"
        name="icon"
        label={t("icon")}
        hint={t("iconHint")}
        dir="ltr"
        defaultValue={initial?.icon ?? ""}
        error={error("icon")}
      />

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
        <Link href="/admin/categories" className={buttonClass("secondary")}>
          {tc("cancel")}
        </Link>
      </div>
    </form>
  );
}
