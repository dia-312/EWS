import jsQR from "jsqr";
import { describe, expect, it } from "vitest";
import { QR_QUIET_ZONE, qrModules, qrSvg } from "./qr";

/** Draws the modules the way a printed or on-screen code looks, then lets a real QR decoder read it. */
function decode(text: string, scale = 8) {
  const modules = qrModules(text);
  const size = (modules.length + QR_QUIET_ZONE * 2) * scale;
  const pixels = new Uint8ClampedArray(size * size * 4).fill(255);

  modules.forEach((row, y) =>
    row.forEach((dark, x) => {
      if (!dark) return;
      for (let dy = 0; dy < scale; dy++) {
        for (let dx = 0; dx < scale; dx++) {
          const px = (x + QR_QUIET_ZONE) * scale + dx;
          const py = (y + QR_QUIET_ZONE) * scale + dy;
          const at = (py * size + px) * 4;
          pixels[at] = pixels[at + 1] = pixels[at + 2] = 0;
        }
      }
    }),
  );
  return jsQR(pixels, size, size)?.data;
}

describe("QR codes", () => {
  const urls = [
    "https://ews.diaararx.workers.dev/ar/products/iphone-15?src=qr",
    "https://shop.example.com/en/products/samsung-55-crystal-uhd-tv?src=qr",
    "https://x.test/ar/products/" + "a-very-long-product-slug-".repeat(6) + "end?src=qr",
  ];

  it.each(urls)("scan back to exactly the product link: %s", (url) => {
    expect(decode(url)).toBe(url);
  });

  it("is a square grid", () => {
    const modules = qrModules(urls[0]);
    expect(modules.length).toBeGreaterThanOrEqual(21);
    expect(modules.every((row) => row.length === modules.length)).toBe(true);
  });

  it("renders a compact SVG with a white quiet zone", () => {
    const svg = qrSvg(urls[0]);
    const modules = qrModules(urls[0]).length;
    expect(svg.startsWith("<svg ")).toBe(true);
    expect(svg).toContain(`viewBox="0 0 ${modules + QR_QUIET_ZONE * 2} ${modules + QR_QUIET_ZONE * 2}"`);
    expect(svg).toContain('fill="#ffffff"');
    // merged rows keep it far smaller than one rectangle per module
    expect(svg.length).toBeLessThan(modules * modules * 12);
    expect(svg).not.toContain("<script");
  });
});
