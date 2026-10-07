import { describe, expect, it } from "vitest";
import { contrastRatio, MIN_TEXT_CONTRAST, MIN_UI_CONTRAST } from "@/lib/color";
import {
  PRESET_DEFINITIONS,
  resolveTheme,
  THEME_PRESETS,
  themeCssVars,
  type StoredTheme,
} from "./theme";

const empty: StoredTheme = {
  preset: "modern",
  primary_color: null,
  secondary_color: null,
  accent_color: null,
  surface_color: null,
  text_color: null,
  font_key: null,
  radius: null,
};

describe("theme presets", () => {
  it("every preset keeps text readable on its background and surface", () => {
    for (const preset of THEME_PRESETS) {
      const { colors } = PRESET_DEFINITIONS[preset];
      expect(contrastRatio(colors.text, colors.background), `${preset} text/background`).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
      expect(contrastRatio(colors.text, colors.surface), `${preset} text/surface`).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
      expect(contrastRatio(colors.primary, colors.background), `${preset} primary/background`).toBeGreaterThanOrEqual(MIN_UI_CONTRAST);
    }
  });
});

describe("resolveTheme", () => {
  it("falls back to the modern preset with no stored theme", () => {
    const theme = resolveTheme(null);
    expect(theme.preset).toBe("modern");
    expect(theme.colors).toEqual(PRESET_DEFINITIONS.modern.colors);
  });

  it("applies customized values over the preset and ignores invalid ones", () => {
    const theme = resolveTheme({
      ...empty,
      preset: "luxury",
      primary_color: "#112233",
      accent_color: "javascript:alert(1)",
      font_key: "comic-sans",
      radius: "lg",
    });
    expect(theme.preset).toBe("luxury");
    expect(theme.colors.primary).toBe("#112233");
    expect(theme.colors.accent).toBe(PRESET_DEFINITIONS.luxury.colors.accent);
    expect(theme.font).toBe(PRESET_DEFINITIONS.luxury.font);
    expect(theme.radius).toBe("lg");
  });

  it("treats an unknown preset as modern", () => {
    expect(resolveTheme({ ...empty, preset: "neon" }).preset).toBe("modern");
  });
});

describe("themeCssVars", () => {
  it("exposes colors, readable foregrounds, radii and font", () => {
    const vars = themeCssVars(resolveTheme({ ...empty, preset: "gaming" }));
    expect(vars["--primary"]).toBe("#8b5cf6");
    expect(vars["--primary-foreground"]).toMatch(/^#/);
    expect(vars["--background"]).toBe("#111827");
    expect(vars["--ui-radius-lg"]).toBe("0.75rem");
    expect(vars["--ui-radius-pill"]).toBe("9999px");
    expect(vars["--font-store"]).toBe("var(--font-cairo)");
  });
});
