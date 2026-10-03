import { inflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { isPwaIconName, renderIconPng } from "./pwa-icon";

/** Reads size and pixels back out of the PNG (RGB, no filtering). */
function decode(png: Buffer) {
  expect(png.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  const idatStart = png.indexOf("IDAT") + 4;
  const idatLength = png.readUInt32BE(idatStart - 8);
  const raw = inflateSync(png.subarray(idatStart, idatStart + idatLength));
  const pixel = (x: number, y: number) => {
    const at = y * (width * 3 + 1) + 1 + x * 3;
    return [raw[at], raw[at + 1], raw[at + 2]];
  };
  return { width, height, pixel };
}

describe("renderIconPng", () => {
  it("makes a square PNG of the requested size", () => {
    const { width, height } = decode(renderIconPng(64, "#2563eb", "#ffffff", false));
    expect([width, height]).toEqual([64, 64]);
  });

  it("paints the corners in the background color and the bag in the foreground color", () => {
    const { pixel } = decode(renderIconPng(100, "#2563eb", "#ffffff", false));
    expect(pixel(0, 0)).toEqual([0x25, 0x63, 0xeb]);
    expect(pixel(99, 99)).toEqual([0x25, 0x63, 0xeb]);
    expect(pixel(50, 60)).toEqual([255, 255, 255]); // middle of the bag
  });

  it("keeps maskable icons' picture smaller, so phones can crop the edges", () => {
    const bagWidth = (maskable: boolean) => {
      const { pixel } = decode(renderIconPng(200, "#000000", "#ffffff", maskable));
      let count = 0;
      for (let x = 0; x < 200; x++) if (pixel(x, 130)[0] > 128) count++;
      return count;
    };
    expect(bagWidth(true)).toBeLessThan(bagWidth(false));
  });
});

describe("isPwaIconName", () => {
  it("accepts only the known icons", () => {
    expect(isPwaIconName("192")).toBe(true);
    expect(isPwaIconName("maskable-512")).toBe(true);
    expect(isPwaIconName("toString")).toBe(false);
    expect(isPwaIconName("../../etc")).toBe(false);
  });
});
