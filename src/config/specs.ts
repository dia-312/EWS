/**
 * Known specification keys. Their labels live in the translation files under
 * `specs.<key>`; products can also use a custom key, which is displayed as typed.
 * Comparison matches specs across products by key, so prefer these.
 */
export const KNOWN_SPEC_KEYS = [
  "screen",
  "screen_size",
  "resolution",
  "processor",
  "ram",
  "storage",
  "camera",
  "front_camera",
  "battery",
  "battery_life",
  "os",
  "smart_os",
  "color",
  "weight",
  "dimensions",
  "connectivity",
  "ports",
  "power",
  "length",
  "type",
  "capacity",
  "spin_speed",
  "hardness",
  "compatibility",
  "pieces",
  "warranty",
] as const;

export type KnownSpecKey = (typeof KNOWN_SPEC_KEYS)[number];

export function isKnownSpecKey(key: string): key is KnownSpecKey {
  return (KNOWN_SPEC_KEYS as readonly string[]).includes(key);
}
