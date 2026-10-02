"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import type { SettingsFormState } from "@/app/admin/(panel)/settings/actions";
import { WorkingHoursEditor } from "@/components/admin/working-hours-editor";
import { Button } from "@/components/ui/button";
import { TextareaField, TextField } from "@/components/ui/field";
import { SelectField } from "@/components/ui/select";
import { locales } from "@/config/i18n";
import { COMMON_TIME_ZONES, CURRENCIES } from "@/lib/validations/settings";
import type { WorkingHours } from "@/lib/working-hours";

export type SettingsFormValues = {
  name: string;
  currency_code: string;
  locale_default: string;
  timezone: string;
  phone: string | null;
  whatsapp: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  map_url: string | null;
  address_ar: string | null;
  address_en: string | null;
  about_text_ar: string | null;
  about_text_en: string | null;
  seo_title: string | null;
  seo_description: string | null;
  working_hours: WorkingHours;
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-border bg-background p-5">
      <h2 className="text-base font-bold">{title}</h2>
      {children}
    </section>
  );
}

export function SettingsForm({
  action,
  initial,
  readOnly,
}: {
  action: (prev: SettingsFormState, formData: FormData) => Promise<SettingsFormState>;
  initial: SettingsFormValues;
  readOnly: boolean;
}) {
  const t = useTranslations("admin.settings.form");
  const tc = useTranslations("admin.common");
  const [state, formAction, pending] = useActionState<SettingsFormState, FormData>(action, {});

  const error = (field: string) => {
    const code = state.fieldErrors?.[field];
    return code ? t(`errors.${code}`) : undefined;
  };

  return (
    <form action={formAction} className="flex max-w-3xl flex-col gap-5" noValidate>
      <fieldset disabled={readOnly} className="flex flex-col gap-5">
        <Section title={t("sections.identity")}>
          <TextField
            id="name"
            name="name"
            label={t("name")}
            defaultValue={initial.name}
            required
            error={error("name")}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              id="locale_default"
              name="locale_default"
              label={t("localeDefault")}
              defaultValue={initial.locale_default}
              error={error("locale_default")}
            >
              {locales.map((locale) => (
                <option key={locale} value={locale}>
                  {t(`locales.${locale}`)}
                </option>
              ))}
            </SelectField>
            <SelectField
              id="currency_code"
              name="currency_code"
              label={t("currency")}
              hint={t("currencyHint")}
              defaultValue={initial.currency_code}
              error={error("currency_code")}
            >
              {CURRENCIES.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </SelectField>
          </div>
          <TextField
            id="timezone"
            name="timezone"
            label={t("timezone")}
            hint={t("timezoneHint")}
            dir="ltr"
            list="timezones"
            defaultValue={initial.timezone}
            error={error("timezone")}
          />
          <datalist id="timezones">
            {COMMON_TIME_ZONES.map((zone) => (
              <option key={zone} value={zone} />
            ))}
          </datalist>
        </Section>

        <Section title={t("sections.contact")}>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              id="phone"
              name="phone"
              type="tel"
              label={t("phone")}
              hint={t("phoneHint")}
              dir="ltr"
              defaultValue={initial.phone ?? ""}
              error={error("phone")}
            />
            <TextField
              id="whatsapp"
              name="whatsapp"
              type="tel"
              label={t("whatsapp")}
              hint={t("whatsappHint")}
              dir="ltr"
              defaultValue={initial.whatsapp ?? ""}
              error={error("whatsapp")}
            />
          </div>
          <TextField
            id="instagram_url"
            name="instagram_url"
            type="url"
            label={t("instagram")}
            hint={t("instagramHint")}
            dir="ltr"
            defaultValue={initial.instagram_url ?? ""}
            error={error("instagram_url")}
          />
          <TextField
            id="facebook_url"
            name="facebook_url"
            type="url"
            label={t("facebook")}
            hint={t("facebookHint")}
            dir="ltr"
            defaultValue={initial.facebook_url ?? ""}
            error={error("facebook_url")}
          />
        </Section>

        <Section title={t("sections.address")}>
          <TextareaField
            id="address_ar"
            name="address_ar"
            label={t("addressAr")}
            defaultValue={initial.address_ar ?? ""}
            error={error("address_ar")}
          />
          <TextareaField
            id="address_en"
            name="address_en"
            label={t("addressEn")}
            dir="ltr"
            defaultValue={initial.address_en ?? ""}
            error={error("address_en")}
          />
          <TextField
            id="map_url"
            name="map_url"
            type="url"
            label={t("mapUrl")}
            hint={t("mapUrlHint")}
            dir="ltr"
            defaultValue={initial.map_url ?? ""}
            error={error("map_url")}
          />
        </Section>

        <section className="rounded-2xl border border-border bg-background p-5">
          <WorkingHoursEditor initial={initial.working_hours} error={error("working_hours")} />
        </section>

        <Section title={t("sections.about")}>
          <TextareaField
            id="about_text_ar"
            name="about_text_ar"
            label={t("aboutAr")}
            rows={5}
            defaultValue={initial.about_text_ar ?? ""}
            error={error("about_text_ar")}
          />
          <TextareaField
            id="about_text_en"
            name="about_text_en"
            label={t("aboutEn")}
            rows={5}
            dir="ltr"
            defaultValue={initial.about_text_en ?? ""}
            error={error("about_text_en")}
          />
        </Section>

        <Section title={t("sections.seo")}>
          <TextField
            id="seo_title"
            name="seo_title"
            label={t("seoTitle")}
            hint={t("seoTitleHint")}
            defaultValue={initial.seo_title ?? ""}
            error={error("seo_title")}
          />
          <TextareaField
            id="seo_description"
            name="seo_description"
            label={t("seoDescription")}
            hint={t("seoDescriptionHint")}
            defaultValue={initial.seo_description ?? ""}
            error={error("seo_description")}
          />
        </Section>
      </fieldset>

      {state.formError && (
        <p role="alert" className="text-sm text-danger">
          {t("saveFailed")}
        </p>
      )}
      {state.saved && (
        <p role="status" className="text-sm text-green-700">
          {t("saved")}
        </p>
      )}

      {!readOnly && (
        <div>
          <Button type="submit" disabled={pending}>
            {pending ? tc("saving") : tc("save")}
          </Button>
        </div>
      )}
    </form>
  );
}
