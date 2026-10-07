import { isHexColor, readableForeground } from "@/lib/color";

export const THEME_PRESETS = ["modern", "minimal", "gaming", "luxury", "tech"] as const;
export type ThemePreset = (typeof THEME_PRESETS)[number];

export const FONT_KEYS = ["tajawal", "cairo", "ibm-plex-sans-arabic"] as const;
export type FontKey = (typeof FONT_KEYS)[number];

export const RADIUS_KEYS = ["none", "sm", "md", "lg", "full"] as const;
export type RadiusKey = (typeof RADIUS_KEYS)[number];

export type ThemeColors = {
  primary: string;
  secondary: string;
  accent: string;
  /** Page canvas behind cards and sections. */
  surface: string;
  /** Cards, panels, inputs and the header. Derived from the preset, not editable. */
  background: string;
  text: string;
};

export type ResolvedTheme = {
  preset: ThemePreset;
  colors: ThemeColors;
  font: FontKey;
  radius: RadiusKey;
};

type PresetDefinition = { colors: ThemeColors; font: FontKey; radius: RadiusKey };

export const PRESET_DEFINITIONS: Record<ThemePreset, PresetDefinition> = {
  modern: {
    colors: {
      primary: "#2563eb",
      secondary: "#0f172a",
      accent: "#f59e0b",
      surface: "#f6f7f9",
      background: "#ffffff",
      text: "#171717",
    },
    font: "tajawal",
    radius: "md",
  },
  minimal: {
    colors: {
      primary: "#171717",
      secondary: "#525252",
      accent: "#737373",
      surface: "#fafafa",
      background: "#ffffff",
      text: "#171717",
    },
    font: "ibm-plex-sans-arabic",
    radius: "sm",
  },
  gaming: {
    colors: {
      primary: "#8b5cf6",
      secondary: "#22d3ee",
      accent: "#f43f5e",
      surface: "#0b0f19",
      background: "#111827",
      text: "#e5e7eb",
    },
    font: "cairo",
    radius: "lg",
  },
  luxury: {
    colors: {
      primary: "#8a6a1f",
      secondary: "#1c1917",
      accent: "#7c2d12",
      surface: "#faf7f0",
      background: "#fffdf8",
      text: "#1c1917",
    },
    font: "tajawal",
    radius: "none",
  },
  tech: {
    colors: {
      primary: "#38bdf8",
      secondary: "#818cf8",
      accent: "#34d399",
      surface: "#020617",
      background: "#0f172a",
      text: "#e2e8f0",
    },
    font: "ibm-plex-sans-arabic",
    radius: "md",
  },
};

export const DEFAULT_PRESET: ThemePreset = "modern";

/** Corner radii (rem) for the lg / xl / 2xl utilities of each radius setting. */
const RADIUS_SCALE: Record<RadiusKey, [string, string, string]> = {
  none: ["0", "0", "0"],
  sm: ["0.25rem", "0.375rem", "0.5rem"],
  md: ["0.5rem", "0.75rem", "1rem"],
  lg: ["0.75rem", "1rem", "1.5rem"],
  full: ["9999px", "1.5rem", "2rem"],
};

/** Radius of pill-shaped buttons, chips and inputs: round unless the owner chose square-ish corners. */
const PILL_RADIUS: Record<RadiusKey, string> = {
  none: "0.125rem",
  sm: "0.5rem",
  md: "9999px",
  lg: "9999px",
  full: "9999px",
};

/** The editable theme columns of store_theme (all nullable except preset). */
export type StoredTheme = {
  preset: string;
  primary_color: string | null;
  secondary_color: string | null;
  accent_color: string | null;
  surface_color: string | null;
  text_color: string | null;
  font_key: string | null;
  radius: string | null;
};

function isOneOf<T extends string>(list: readonly T[], value: string | null | undefined): value is T {
  return value != null && (list as readonly string[]).includes(value);
}

function validColor(value: string | null | undefined, fallback: string) {
  return value && isHexColor(value) ? value.toLowerCase() : fallback;
}

/** Starts from the preset and applies whatever the store customized. */
export function resolveTheme(stored: StoredTheme | null | undefined): ResolvedTheme {
  const preset = isOneOf(THEME_PRESETS, stored?.preset) ? stored.preset : DEFAULT_PRESET;
  const base = PRESET_DEFINITIONS[preset];

  return {
    preset,
    colors: {
      primary: validColor(stored?.primary_color, base.colors.primary),
      secondary: validColor(stored?.secondary_color, base.colors.secondary),
      accent: validColor(stored?.accent_color, base.colors.accent),
      surface: validColor(stored?.surface_color, base.colors.surface),
      background: base.colors.background,
      text: validColor(stored?.text_color, base.colors.text),
    },
    font: isOneOf(FONT_KEYS, stored?.font_key) ? stored.font_key : base.font,
    radius: isOneOf(RADIUS_KEYS, stored?.radius) ? stored.radius : base.radius,
  };
}

/** CSS custom properties for the theme; set them on a wrapper element's style. */
export function themeCssVars(theme: ResolvedTheme): Record<string, string> {
  const { colors } = theme;
  const [lg, xl, xxl] = RADIUS_SCALE[theme.radius];

  return {
    "--background": colors.background,
    "--foreground": colors.text,
    "--surface": colors.surface,
    "--primary": colors.primary,
    "--primary-foreground": readableForeground(colors.primary),
    "--secondary": colors.secondary,
    "--secondary-foreground": readableForeground(colors.secondary),
    "--accent": colors.accent,
    "--accent-foreground": readableForeground(colors.accent),
    "--ui-radius-lg": lg,
    "--ui-radius-xl": xl,
    "--ui-radius-2xl": xxl,
    "--ui-radius-pill": PILL_RADIUS[theme.radius],
    "--font-store": `var(--font-${theme.font})`,
  };
}
