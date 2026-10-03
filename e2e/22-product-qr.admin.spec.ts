import { readFile } from "node:fs/promises";
import { expect, test } from "./fixtures";

test("the owner downloads a print-ready QR code for a product", async ({ page }) => {
  await page.goto("/admin/products");
  await page.getByRole("row", { name: /iPhone 15/ }).getByRole("link", { name: "Edit" }).click();

  const section = page.getByRole("region", { name: "QR code" });
  await expect(section.getByRole("img", { name: "QR code for this product" })).toBeVisible();
  await expect(section).toContainText("/ar/products/iphone-15?src=qr");

  const svgDownload = page.waitForEvent("download");
  await section.getByRole("button", { name: "Download SVG (for print)" }).click();
  const svg = await svgDownload;
  expect(svg.suggestedFilename()).toBe("iphone-15-qr.svg");
  expect(await readFile((await svg.path())!, "utf8")).toMatch(/^<svg[^>]+viewBox="0 0 \d+ \d+"/);

  const pngDownload = page.waitForEvent("download");
  await section.getByRole("button", { name: "Download PNG" }).click();
  const png = await pngDownload;
  expect(png.suggestedFilename()).toBe("iphone-15-qr.png");
  const bytes = await readFile((await png.path())!);
  expect(bytes.subarray(1, 4).toString("ascii")).toBe("PNG");
  expect(bytes.length).toBeGreaterThan(1000);
});
