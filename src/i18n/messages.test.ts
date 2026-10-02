import { describe, expect, it } from "vitest";
import { KNOWN_SPEC_KEYS } from "@/config/specs";
import ar from "../../messages/ar.json";
import en from "../../messages/en.json";

function keyPaths(value: unknown, prefix = ""): string[] {
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, child]) =>
      keyPaths(child, prefix ? `${prefix}.${key}` : key),
    );
  }
  return [prefix];
}

describe("translations", () => {
  it("have the same keys in Arabic and English", () => {
    const arKeys = keyPaths(ar).sort();
    const enKeys = keyPaths(en).sort();
    expect(arKeys.filter((key) => !enKeys.includes(key))).toEqual([]);
    expect(enKeys.filter((key) => !arKeys.includes(key))).toEqual([]);
  });

  it("have no empty strings", () => {
    for (const messages of [ar, en]) {
      const empty = keyPaths(messages).filter((path) => {
        const value = path
          .split(".")
          .reduce<unknown>((node, key) => (node as Record<string, unknown>)[key], messages);
        return value === "";
      });
      expect(empty).toEqual([]);
    }
  });

  it("label every known spec key in both languages", () => {
    for (const key of KNOWN_SPEC_KEYS) {
      expect((ar.specs as Record<string, string>)[key]).toBeTruthy();
      expect((en.specs as Record<string, string>)[key]).toBeTruthy();
    }
  });
});
