"use client";

import { useActionState, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { AppearanceFormState } from "@/app/admin/(panel)/appearance/actions";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/select";
import {
  FONT_KEYS,
  PRESET_DEFINITIONS,
  RADIUS_KEYS,
  resolveTheme,
  THEME_PRESETS,
  themeCssVars,
  type FontKey,
  type RadiusKey,
  type ThemePreset,
} from "@/config/theme";
import { contrastRatio, isHexColor } from "@/lib/color";
import { checkContrast } from "@/lib/validations/settings";

export type AppearanceValues = {
  preset: ThemePreset;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  surface_color: string;
  text_color: string;
  font_key: FontKey;
  radius: RadiusKey;
};

const COLOR_FIELDS = [
  "primary_color",
  "secondary_color",
  "accent_color",
  "surface_color",
  "text_color",
] as const;

type ColorField = (typeof COLOR_FIELDS)[number];

/** Values of a preset, in the shape of the form. */
function presetValues(preset: ThemePreset): AppearanceValues {
  const { colors, font, radius } = PRESET_DEFINITIONS[preset];
  return {
    preset,
    primary_color: colors.primary,
    secondary_color: colors.secondary,
    accent_color: colors.accent,
    surface_color: colors.surface,
    text_color: colors.text,
    font_key: font,
    radius,
  };
}

function ColorInput({
  id,
  name,
  label,
  value,
  error,
  onChange,
}: {
  id: string;
  name: string;
  label: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  const valid = isHexColor(value);
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={label}
          value={valid ? value : "#000000"}
          onChange={(event) => onChange(event.target.value)}
          className="size-10 shrink-0 cursor-pointer rounded-lg border border-border bg-background p-1"
        />
        <input
          id={id}
          name={name}
          value={value}
          onChange={(event) => onChange(event.target.value.trim())}
          maxLength={7}
          dir="ltr"
          spellCheck={false}
          aria-invalid={!valid || error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`w-full rounded-lg border bg-background px-3 py-2.5 font-mono text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary ${valid && !error ? "border-border" : "border-danger"}`}
        />
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function AppearanceForm({
  action,
  initial,
  storeName,
  logoUrl,
  readOnly,
}: {
  action: (prev: AppearanceFormState, formData: FormData) => Promise<AppearanceFormState>;
  initial: AppearanceValues;
  storeName: string;
  logoUrl: string | null;
  readOnly: boolean;
}) {
  const t = useTranslations("admin.appearance");
  const tc = useTranslations("admin.common");
  const [state, formAction, pending] = useActionState<AppearanceFormState, FormData>(action, {});
  const [values, setValues] = useState<AppearanceValues>(initial);

  const set = <K extends keyof AppearanceValues>(key: K, value: AppearanceValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  const allValid = COLOR_FIELDS.every((field) => isHexColor(values[field]));

  // Live accessibility feedback while editing; the server applies the same rules.
  const liveErrors = allValid
    ? checkContrast(values.preset, {
        primary: values.primary_color,
        surface: values.surface_color,
        text: values.text_color,
      })
    : {};

  const previewStyle = useMemo(
    () =>
      themeCssVars(
        resolveTheme({
          preset: values.preset,
          primary_color: isHexColor(values.primary_color) ? values.primary_color : null,
          secondary_color: isHexColor(values.secondary_color) ? values.secondary_color : null,
          accent_color: isHexColor(values.accent_color) ? values.accent_color : null,
          surface_color: isHexColor(values.surface_color) ? values.surface_color : null,
          text_color: isHexColor(values.text_color) ? values.text_color : null,
          font_key: values.font_key,
          radius: values.radius,
        }),
      ) as React.CSSProperties,
    [values],
  );

  const fieldError = (field: string) => {
    const code = state.fieldErrors?.[field] ?? (liveErrors as Record<string, string>)[field];
    return code ? t(`errors.${code}`) : undefined;
  };

  const colorLabel: Record<ColorField, string> = {
    primary_color: t("colors.primary"),
    secondary_color: t("colors.secondary"),
    accent_color: t("colors.accent"),
    surface_color: t("colors.surface"),
    text_color: t("colors.text"),
  };

  const background = PRESET_DEFINITIONS[values.preset].colors.background;
  const textContrast = allValid ? contrastRatio(values.text_color, background) : null;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <form action={formAction} className="flex flex-col gap-5" noValidate>
        <fieldset disabled={readOnly} className="flex flex-col gap-5">
          <section className="flex flex-col gap-4 rounded-2xl border border-border bg-background p-5">
            <h2 className="text-base font-bold">{t("sections.preset")}</h2>
            <SelectField
              id="preset"
              name="preset"
              label={t("preset")}
              hint={t("presetHint")}
              value={values.preset}
              onChange={(event) => setValues(presetValues(event.target.value as ThemePreset))}
            >
              {THEME_PRESETS.map((preset) => (
                <option key={preset} value={preset}>
                  {t(`presets.${preset}`)}
                </option>
              ))}
            </SelectField>
            <div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setValues(presetValues(values.preset))}
              >
                {t("resetToPreset")}
              </Button>
            </div>
          </section>

          <section className="flex flex-col gap-4 rounded-2xl border border-border bg-background p-5">
            <h2 className="text-base font-bold">{t("sections.colors")}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {COLOR_FIELDS.map((field) => (
                <ColorInput
                  key={field}
                  id={field}
                  name={field}
                  label={colorLabel[field]}
                  value={values[field]}
                  error={fieldError(field)}
                  onChange={(value) => set(field, value)}
                />
              ))}
            </div>
            {textContrast !== null && (
              <p className="text-xs text-muted">
                {t("contrastInfo", { ratio: textContrast.toFixed(1) })}
              </p>
            )}
          </section>

          <section className="flex flex-col gap-4 rounded-2xl border border-border bg-background p-5">
            <h2 className="text-base font-bold">{t("sections.shape")}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                id="font_key"
                name="font_key"
                label={t("font")}
                value={values.font_key}
                onChange={(event) => set("font_key", event.target.value as FontKey)}
              >
                {FONT_KEYS.map((font) => (
                  <option key={font} value={font}>
                    {t(`fonts.${font}`)}
                  </option>
                ))}
              </SelectField>
              <SelectField
                id="radius"
                name="radius"
                label={t("radius")}
                value={values.radius}
                onChange={(event) => set("radius", event.target.value as RadiusKey)}
              >
                {RADIUS_KEYS.map((radius) => (
                  <option key={radius} value={radius}>
                    {t(`radii.${radius}`)}
                  </option>
                ))}
              </SelectField>
            </div>
          </section>
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
            <Button
              type="submit"
              disabled={pending || !allValid || Object.keys(liveErrors).length > 0}
            >
              {pending ? tc("saving") : tc("save")}
            </Button>
          </div>
        )}
      </form>

      <aside aria-label={t("preview.title")} className="lg:sticky lg:top-4 lg:self-start">
        <h2 className="mb-2 text-sm font-medium text-muted">{t("preview.title")}</h2>
        <div
          className="theme-root overflow-hidden rounded-2xl border border-border bg-surface text-foreground"
          style={previewStyle}
        >
          <div className="flex items-center gap-2 border-b border-border bg-background px-4 py-3">
            {logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="" className="size-7 rounded object-contain" />
            )}
            <span className="font-bold">{storeName}</span>
          </div>

          <div className="flex flex-col gap-4 p-4">
            <div className="rounded-xl border border-border bg-background p-3">
              <div className="mb-3 flex aspect-[4/3] items-center justify-center rounded-lg bg-surface text-xs text-muted">
                {t("preview.image")}
              </div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{t("preview.product")}</p>
                  <p className="text-sm text-muted">{t("preview.brand")}</p>
                </div>
                <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground">
                  {t("preview.badge")}
                </span>
              </div>
              <p className="mt-2 text-lg font-bold text-primary">₪ 1,299</p>
              <div className="mt-3 flex gap-2">
                <span className="flex-1 rounded-lg bg-primary px-3 py-2 text-center text-sm font-medium text-primary-foreground">
                  {t("preview.primaryButton")}
                </span>
                <span className="rounded-lg bg-secondary px-3 py-2 text-sm font-medium text-secondary-foreground">
                  {t("preview.secondaryButton")}
                </span>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
