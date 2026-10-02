import { z } from "zod";
import { locales } from "@/config/i18n";
import {
  FONT_KEYS,
  PRESET_DEFINITIONS,
  RADIUS_KEYS,
  THEME_PRESETS,
  type ThemePreset,
} from "@/config/theme";
import { contrastRatio, isHexColor, MIN_TEXT_CONTRAST, MIN_UI_CONTRAST } from "@/lib/color";
import {
  DAYS,
  MAX_INTERVALS_PER_DAY,
  TIME_PATTERN,
  type Interval,
  type WorkingHours,
} from "@/lib/working-hours";
import type { FormErrors } from "@/lib/validations/category";

export const CURRENCIES = ["ILS", "JOD", "USD", "EUR", "SAR", "AED", "EGP", "TRY"] as const;

/** Time zones offered as suggestions; any valid IANA zone is accepted. */
export const COMMON_TIME_ZONES = [
  "Asia/Hebron",
  "Asia/Jerusalem",
  "Asia/Gaza",
  "Asia/Amman",
  "Asia/Beirut",
  "Asia/Riyadh",
  "Asia/Dubai",
  "Africa/Cairo",
  "Europe/Istanbul",
  "UTC",
] as const;

function isValidTimeZone(value: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

/**
 * WhatsApp links (wa.me) need digits only, with the country code and no leading
 * zeros or "+". Returns null when the number cannot be a valid international one.
 */
export function normalizeWhatsapp(input: string): string | null {
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0")) return null; // local format: country code unknown
  return digits.length >= 8 && digits.length <= 15 ? digits : null;
}

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value === "" ? null : value));

/** https URL, optionally restricted to a few hosts (and their subdomains). */
function optionalHttpsUrl(hosts?: readonly string[]) {
  return z
    .string()
    .trim()
    .max(300)
    .transform((value) => (value === "" ? null : value))
    .refine((value) => {
      if (value === null) return true;
      try {
        const url = new URL(value);
        if (url.protocol !== "https:") return false;
        return (
          !hosts ||
          hosts.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`))
        );
      } catch {
        return false;
      }
    });
}

const timeField = z.string().trim();

function parseInterval(open: string, close: string): Interval | "empty" | "invalid" {
  const o = timeField.parse(open);
  const c = timeField.parse(close);
  if (!o && !c) return "empty";
  if (!TIME_PATTERN.test(o) || !TIME_PATTERN.test(c) || o === c) return "invalid";
  return { open: o, close: c };
}

/** Reads hours_<day>_closed and hours_<day>_open1/close1/open2/close2 inputs. */
export function parseWorkingHoursForm(formData: FormData): { hours: WorkingHours; valid: boolean } {
  const hours: WorkingHours = {};
  let valid = true;
  const text = (name: string) => String(formData.get(name) ?? "");

  for (const day of DAYS) {
    if (formData.get(`hours_${day}_closed`) === "on") {
      hours[day] = [];
      continue;
    }

    const intervals: Interval[] = [];
    for (let slot = 1; slot <= MAX_INTERVALS_PER_DAY; slot++) {
      const interval = parseInterval(text(`hours_${day}_open${slot}`), text(`hours_${day}_close${slot}`));
      if (interval === "invalid") valid = false;
      else if (interval !== "empty") intervals.push(interval);
    }
    hours[day] = intervals;
  }

  return { hours, valid };
}

export const settingsSchema = z.object({
  name: z.string().trim().min(1).max(80),
  currency_code: z.enum(CURRENCIES),
  locale_default: z.enum(locales),
  timezone: z.string().trim().refine(isValidTimeZone),
  phone: z
    .string()
    .trim()
    .max(25)
    .transform((value) => (value === "" ? null : value))
    .refine((value) => value === null || /^[+\d\s()-]{6,25}$/.test(value)),
  whatsapp: z
    .string()
    .trim()
    .transform((value) => (value === "" ? null : normalizeWhatsapp(value) ?? "invalid"))
    .refine((value) => value !== "invalid"),
  instagram_url: optionalHttpsUrl(["instagram.com"]),
  facebook_url: optionalHttpsUrl(["facebook.com", "fb.com"]),
  map_url: optionalHttpsUrl(),
  address_ar: optionalText(300),
  address_en: optionalText(300),
  about_text_ar: optionalText(2000),
  about_text_en: optionalText(2000),
  seo_title: optionalText(70),
  seo_description: optionalText(160),
});

export type SettingsInput = z.infer<typeof settingsSchema>;

const SETTINGS_FIELDS = Object.keys(settingsSchema.shape);

export function parseSettingsForm(formData: FormData) {
  const raw: Record<string, string> = {};
  for (const field of SETTINGS_FIELDS) raw[field] = String(formData.get(field) ?? "");
  return settingsSchema.safeParse(raw);
}

export function toSettingsFieldErrors(error: z.ZodError): FormErrors {
  const errors: FormErrors = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "form");
    if (errors[field]) continue;
    errors[field] =
      issue.code === "too_small" && issue.minimum === 1
        ? "required"
        : issue.code === "too_big"
          ? "too_long"
          : "invalid";
  }
  return errors;
}

// ------------------------------------------------------------- appearance

const colorField = z.string().trim().refine(isHexColor);

export const appearanceSchema = z.object({
  preset: z.enum(THEME_PRESETS),
  primary_color: colorField,
  secondary_color: colorField,
  accent_color: colorField,
  surface_color: colorField,
  text_color: colorField,
  font_key: z.enum(FONT_KEYS),
  radius: z.enum(RADIUS_KEYS),
});

export type AppearanceInput = z.infer<typeof appearanceSchema>;

/** Accessibility rules for the chosen palette; returns field error codes. */
export function checkContrast(
  preset: ThemePreset,
  colors: { primary: string; surface: string; text: string },
): FormErrors {
  const { background } = PRESET_DEFINITIONS[preset].colors;
  const errors: FormErrors = {};

  if (
    contrastRatio(colors.text, background) < MIN_TEXT_CONTRAST ||
    contrastRatio(colors.text, colors.surface) < MIN_TEXT_CONTRAST
  ) {
    errors.text_color = "low_contrast_text";
  }
  if (contrastRatio(colors.primary, background) < MIN_UI_CONTRAST) {
    errors.primary_color = "low_contrast_primary";
  }
  return errors;
}

export function parseAppearanceForm(formData: FormData) {
  const text = (name: string) => String(formData.get(name) ?? "");
  return appearanceSchema.safeParse({
    preset: text("preset"),
    primary_color: text("primary_color").toLowerCase(),
    secondary_color: text("secondary_color").toLowerCase(),
    accent_color: text("accent_color").toLowerCase(),
    surface_color: text("surface_color").toLowerCase(),
    text_color: text("text_color").toLowerCase(),
    font_key: text("font_key"),
    radius: text("radius"),
  });
}

/**
 * Values equal to the preset's own are stored as null so that switching preset
 * later still changes everything the store never customized.
 */
export function toStoredTheme(input: AppearanceInput) {
  const base = PRESET_DEFINITIONS[input.preset];
  const diff = (value: string, preset: string) => (value === preset ? null : value);

  return {
    preset: input.preset,
    primary_color: diff(input.primary_color, base.colors.primary),
    secondary_color: diff(input.secondary_color, base.colors.secondary),
    accent_color: diff(input.accent_color, base.colors.accent),
    surface_color: diff(input.surface_color, base.colors.surface),
    text_color: diff(input.text_color, base.colors.text),
    font_key: input.font_key === base.font ? null : input.font_key,
    radius: input.radius === base.radius ? null : input.radius,
  };
}

export function toAppearanceFieldErrors(error: z.ZodError): FormErrors {
  const errors: FormErrors = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "form");
    if (!errors[field]) errors[field] = "invalid";
  }
  return errors;
}
