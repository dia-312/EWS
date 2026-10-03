"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import type { SectionFormState } from "@/app/admin/(panel)/homepage/actions";
import { Button, buttonClass } from "@/components/ui/button";
import { TextareaField, TextField } from "@/components/ui/field";
import { DEFAULT_LIMIT, MAX_LIMIT, MIN_LIMIT } from "@/lib/homepage";
import { useActionForm } from "@/lib/use-action-form";

export type SectionFormValues = {
  title_ar: string | null;
  title_en: string | null;
  subtitle_ar: string | null;
  subtitle_en: string | null;
  limit: number;
};

type SectionFormProps = {
  action: (prev: SectionFormState, formData: FormData) => Promise<SectionFormState>;
  initial: SectionFormValues;
  /** Sections that list products also choose how many to show. */
  showLimit: boolean;
  /** The text shown when the title is left empty. */
  defaultTitles: { ar: string; en: string };
};

export function SectionForm({ action, initial, showLimit, defaultTitles }: SectionFormProps) {
  const t = useTranslations("admin.homepage.form");
  const tc = useTranslations("admin.common");
  const { state, onSubmit, onInput, isDismissed, pending } = useActionForm<SectionFormState>(action, {});

  const error = (field: string) => {
    if (isDismissed(field)) return undefined;
    const code = state.fieldErrors?.[field];
    return code ? t(`errors.${code}`) : undefined;
  };

  return (
    <form onSubmit={onSubmit} onInput={onInput} className="flex max-w-2xl flex-col gap-5" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          id="title_ar"
          name="title_ar"
          label={t("titleAr")}
          hint={t("titleHint", { title: defaultTitles.ar })}
          defaultValue={initial.title_ar ?? ""}
          error={error("title_ar")}
        />
        <TextField
          id="title_en"
          name="title_en"
          label={t("titleEn")}
          hint={t("titleHint", { title: defaultTitles.en })}
          dir="ltr"
          defaultValue={initial.title_en ?? ""}
          error={error("title_en")}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <TextareaField
          id="subtitle_ar"
          name="subtitle_ar"
          label={t("subtitleAr")}
          defaultValue={initial.subtitle_ar ?? ""}
          error={error("subtitle_ar")}
        />
        <TextareaField
          id="subtitle_en"
          name="subtitle_en"
          label={t("subtitleEn")}
          dir="ltr"
          defaultValue={initial.subtitle_en ?? ""}
          error={error("subtitle_en")}
        />
      </div>

      {showLimit && (
        <TextField
          id="limit"
          name="limit"
          label={t("limit")}
          hint={t("limitHint", { min: MIN_LIMIT, max: MAX_LIMIT, default: DEFAULT_LIMIT })}
          type="number"
          min={MIN_LIMIT}
          max={MAX_LIMIT}
          step="1"
          dir="ltr"
          defaultValue={initial.limit}
          error={error("limit")}
          className="max-w-32"
        />
      )}

      <p className="text-sm text-muted">{t("cacheNote")}</p>

      {state.formError && (
        <p role="alert" className="text-sm text-danger">
          {t("saveFailed")}
        </p>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? tc("saving") : tc("save")}
        </Button>
        <Link href="/admin/homepage" className={buttonClass("secondary")}>
          {tc("cancel")}
        </Link>
      </div>
    </form>
  );
}
