import { describe, expect, it } from "vitest";
import {
  contrastRatio,
  isHexColor,
  readableForeground,
  relativeLuminance,
} from "./color";

describe("color helpers", () => {
  it("validates six-digit hex colors only", () => {
    expect(isHexColor("#2563eb")).toBe(true);
    expect(isHexColor("#FFF")).toBe(false);
    expect(isHexColor("2563eb")).toBe(false);
    expect(isHexColor("red")).toBe(false);
    expect(isHexColor("#2563eb; background:url(x)")).toBe(false);
  });

  it("computes luminance and contrast like WCAG", () => {
    expect(relativeLuminance("#ffffff")).toBeCloseTo(1, 5);
    expect(relativeLuminance("#000000")).toBeCloseTo(0, 5);
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 1);
    expect(contrastRatio("#ffffff", "#ffffff")).toBeCloseTo(1, 5);
    // symmetric
    expect(contrastRatio("#2563eb", "#ffffff")).toBeCloseTo(contrastRatio("#ffffff", "#2563eb"), 5);
  });

  it("picks a readable foreground for any background", () => {
    expect(readableForeground("#000000")).toBe("#ffffff");
    expect(readableForeground("#ffffff")).toBe("#000000");
    expect(readableForeground("#2563eb")).toBe("#ffffff");
    expect(readableForeground("#f59e0b")).toBe("#000000");

    // The better of white/near-black always reaches AA for normal text.
    for (const hex of ["#777777", "#808080", "#767676", "#ff0000", "#00ff00", "#0000ff"]) {
      expect(contrastRatio(hex, readableForeground(hex))).toBeGreaterThanOrEqual(4.5);
    }
  });
});
