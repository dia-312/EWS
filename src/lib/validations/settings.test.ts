import { describe, expect, it } from "vitest";
import { PRESET_DEFINITIONS } from "@/config/theme";
import {
  checkContrast,
  normalizeWhatsapp,
  parseAppearanceForm,
  parseSettingsForm,
  parseWorkingHoursForm,
  toStoredTheme,
} from "./settings";

function form(entries: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.append(key, value);
  return data;
}

const validSettings = {
  name: "متجر الاختبار",
  currency_code: "ILS",
  locale_default: "ar",
  timezone: "Asia/Hebron",
};

describe("normalizeWhatsapp", () => {
  it("keeps digits only and drops + and 00", () => {
    expect(normalizeWhatsapp("+970 59 123 4567")).toBe("970591234567");
    expect(normalizeWhatsapp("00970591234567")).toBe("970591234567");
  });

  it("rejects local numbers without a country code and bad lengths", () => {
    expect(normalizeWhatsapp("0591234567")).toBeNull();
    expect(normalizeWhatsapp("123")).toBeNull();
    expect(normalizeWhatsapp("9".repeat(16))).toBeNull();
  });
});

describe("parseSettingsForm", () => {
  it("accepts the minimum and turns empty optional fields into null", () => {
    const result = parseSettingsForm(form(validSettings));
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.phone).toBeNull();
    expect(result.data.whatsapp).toBeNull();
    expect(result.data.instagram_url).toBeNull();
  });

  it("normalizes the WhatsApp number", () => {
    const result = parseSettingsForm(form({ ...validSettings, whatsapp: "+970 59 123 4567" }));
    expect(result.success && result.data.whatsapp).toBe("970591234567");
  });

  it("rejects bad names, time zones, currencies and WhatsApp numbers", () => {
    for (const patch of <Record<string, string>[]>[
      { name: "" },
      { timezone: "Mars/Olympus" },
      { currency_code: "XYZ" },
      { whatsapp: "0591234567" },
    ]) {
      expect(parseSettingsForm(form({ ...validSettings, ...patch })).success).toBe(false);
    }
  });

  it("only accepts https social links on the right hosts", () => {
    const ok = parseSettingsForm(
      form({ ...validSettings, instagram_url: "https://www.instagram.com/shop", facebook_url: "https://facebook.com/shop" }),
    );
    expect(ok.success).toBe(true);

    for (const patch of <Record<string, string>[]>[
      { instagram_url: "http://instagram.com/shop" },
      { instagram_url: "https://evil.com/instagram.com" },
      { facebook_url: "javascript:alert(1)" },
      { map_url: "ftp://maps.example.com" },
    ]) {
      expect(parseSettingsForm(form({ ...validSettings, ...patch })).success).toBe(false);
    }
  });
});

describe("parseWorkingHoursForm", () => {
  it("reads closed days and up to two intervals", () => {
    const { hours, valid } = parseWorkingHoursForm(
      form({
        hours_fri_closed: "on",
        hours_sat_open1: "09:00",
        hours_sat_close1: "13:00",
        hours_sat_open2: "16:00",
        hours_sat_close2: "21:00",
      }),
    );
    expect(valid).toBe(true);
    expect(hours.fri).toEqual([]);
    expect(hours.sat).toHaveLength(2);
    expect(hours.sun).toEqual([]);
  });

  it("flags half-filled, malformed and zero-length intervals", () => {
    expect(parseWorkingHoursForm(form({ hours_sat_open1: "09:00", hours_sat_close1: "" })).valid).toBe(false);
    expect(parseWorkingHoursForm(form({ hours_sat_open1: "9am", hours_sat_close1: "5pm" })).valid).toBe(false);
    expect(parseWorkingHoursForm(form({ hours_sat_open1: "09:00", hours_sat_close1: "09:00" })).valid).toBe(false);
  });
});

describe("appearance", () => {
  const modern = PRESET_DEFINITIONS.modern;
  const base = {
    preset: "modern",
    primary_color: modern.colors.primary,
    secondary_color: modern.colors.secondary,
    accent_color: modern.colors.accent,
    surface_color: modern.colors.surface,
    text_color: modern.colors.text,
    font_key: modern.font,
    radius: modern.radius,
  };

  it("stores nothing for values that equal the preset", () => {
    const parsed = parseAppearanceForm(form(base));
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(toStoredTheme(parsed.data)).toEqual({
      preset: "modern",
      primary_color: null,
      secondary_color: null,
      accent_color: null,
      surface_color: null,
      text_color: null,
      font_key: null,
      radius: null,
    });
  });

  it("stores only the customized values", () => {
    const parsed = parseAppearanceForm(form({ ...base, primary_color: "#E11D48", radius: "full" }));
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    const stored = toStoredTheme(parsed.data);
    expect(stored.primary_color).toBe("#e11d48");
    expect(stored.radius).toBe("full");
    expect(stored.accent_color).toBeNull();
  });

  it("rejects non-hex colors and unknown options", () => {
    expect(parseAppearanceForm(form({ ...base, primary_color: "red" })).success).toBe(false);
    expect(parseAppearanceForm(form({ ...base, preset: "neon" })).success).toBe(false);
    expect(parseAppearanceForm(form({ ...base, font_key: "comic" })).success).toBe(false);
  });

  it("flags low-contrast palettes", () => {
    const colors = { primary: "#2563eb", surface: "#f6f7f9", text: "#171717" };
    expect(checkContrast("modern", colors)).toEqual({});
    expect(checkContrast("modern", { ...colors, text: "#cccccc" }).text_color).toBe("low_contrast_text");
    expect(checkContrast("modern", { ...colors, primary: "#fafafa" }).primary_color).toBe("low_contrast_primary");
  });
});
