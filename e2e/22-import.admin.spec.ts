import { readFile } from "node:fs/promises";
import { expect, test, unique } from "./fixtures";

const HEADER = "slug,name_ar,name_en,category,brand,price,availability";

const csv = (...lines: string[]) => Buffer.from(`﻿${lines.join("\r\n")}\r\n`, "utf8");

test("the owner imports products from a spreadsheet, updates prices from another, and exports them", async ({ page }) => {
  const first = unique("e2e-csv-a");
  const second = unique("e2e-csv-b");
  const broken = unique("e2e-csv-bad");

  await page.goto("/admin/products");
  await page.getByRole("link", { name: "Import from CSV" }).click();
  await expect(page.getByRole("heading", { name: "Import products from a file" })).toBeVisible();

  // ---- the template is a real CSV with the store's own category in it
  const templateDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download the template" }).click();
  const template = await templateDownload;
  expect(template.suggestedFilename()).toBe("products-template.csv");
  const templateText = await readFile((await template.path())!, "utf8");
  expect(templateText).toContain("slug,name_ar,name_en,category,brand,price");
  expect(templateText).toContain("example-headphones");

  // ---- check first: two good rows (Arabic digits, a category by its Arabic name, a new brand) and one bad row
  const file = page.locator("#import-file");
  await file.setInputFiles({
    name: "products.csv",
    mimeType: "text/csv",
    buffer: csv(
      HEADER,
      `${first},منتج استيراد أول,CSV First,mobiles,,١٢٣٫٥,متوفر`,
      `${second},منتج استيراد ثان,CSV Second,Mobile Phones,E2E CSV Brand,40,limited`,
      `${broken},منتج خاطئ,,no-such-category,,10,`,
    ),
  });
  await page.getByRole("button", { name: "Check the file" }).click();

  const preview = page.locator("[data-import-preview]");
  await expect(preview.locator("[data-count='created'] dd")).toHaveText("2");
  await expect(preview.locator("[data-count='updated'] dd")).toHaveText("0");
  await expect(preview.locator("[data-count='invalid'] dd")).toHaveText("1");
  await expect(preview.getByText("Brands that will be created: E2E CSV Brand")).toBeVisible();
  const badRow = preview.locator("tr", { hasText: broken });
  await expect(badRow).toContainText("category: no such category");
  await expect(badRow).toContainText("Skipped");

  // nothing is saved by checking
  await page.goto("/admin/products");
  await expect(page.getByRole("row", { name: new RegExp(first) })).toHaveCount(0);

  // ---- import
  await page.goto("/admin/products/import");
  await page.locator("#import-file").setInputFiles({
    name: "products.csv",
    mimeType: "text/csv",
    buffer: csv(
      HEADER,
      `${first},منتج استيراد أول,CSV First,mobiles,,١٢٣٫٥,متوفر`,
      `${second},منتج استيراد ثان,CSV Second,Mobile Phones,E2E CSV Brand,40,limited`,
      `${broken},منتج خاطئ,,no-such-category,,10,`,
    ),
  });
  await page.getByRole("button", { name: "Check the file" }).click();
  await page.getByRole("button", { name: "Import 2 products" }).click();
  const done = page.locator("[data-import-done]");
  await expect(done).toContainText("2 created, 0 updated, 1 skipped.");
  await expect(done).toContainText("hidden until you add an image");

  await page.goto("/admin/products");
  const row = (slug: string) => page.getByRole("row", { name: new RegExp(slug) });
  await expect(row(first)).toContainText("Hidden");
  await expect(row(second)).toContainText("Hidden");
  await expect(row(second)).toContainText("E2E CSV Brand");
  await expect(row(broken)).toHaveCount(0);

  // ---- a second file (semicolons, as Arabic-region Excel saves it) changes only the price of one product
  await page.goto("/admin/products/import");
  await page.locator("#import-file").setInputFiles({
    name: "prices.csv",
    mimeType: "text/csv",
    buffer: csv("slug;price", `${first};150`),
  });
  await page.getByRole("button", { name: "Check the file" }).click();
  await expect(page.locator("[data-count='created'] dd")).toHaveText("0");
  await expect(page.locator("[data-count='updated'] dd")).toHaveText("1");
  await page.getByRole("button", { name: "Import 1 products" }).click();
  await expect(page.locator("[data-import-done]")).toContainText("0 created, 1 updated, 0 skipped.");

  // ---- the export shows the new price and keeps everything else
  const exported = await page.request.get("/admin/products/export");
  expect(exported.status()).toBe(200);
  expect(exported.headers()["content-type"]).toContain("text/csv");
  expect(exported.headers()["content-disposition"]).toMatch(/attachment; filename="products-\d{4}-\d{2}-\d{2}\.csv"/);
  const exportedText = await exported.text();
  expect(exportedText.startsWith("﻿slug,name_ar,name_en,category,brand,price")).toBe(true);
  const line = exportedText.split("\r\n").find((text) => text.startsWith(first))!;
  expect(line).toContain("منتج استيراد أول");
  expect(line).toContain("CSV First");
  expect(line).toContain(",mobiles,");
  expect(line).toContain(",150,in_stock,");

  // ---- clean up
  await page.goto("/admin/products");
  for (const slug of [first, second]) {
    const target = row(slug);
    await target.getByRole("button", { name: "Delete", exact: true }).click();
    await target.getByRole("dialog").getByRole("button", { name: "Yes, delete" }).click();
    await expect(target).toHaveCount(0);
  }
});

test("a file that cannot be used says why", async ({ page }) => {
  await page.goto("/admin/products/import");
  await expect(page.getByRole("button", { name: "Check the file" })).toBeDisabled();

  await page.locator("#import-file").setInputFiles({ name: "empty.csv", mimeType: "text/csv", buffer: csv("slug,price") });
  await page.getByRole("button", { name: "Check the file" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "The file has no products" })).toBeVisible();
});

test("the export needs an admin session", async ({ playwright, baseURL }) => {
  // an explicitly empty session: no cookies at all
  const anonymous = await playwright.request.newContext({ baseURL, storageState: { cookies: [], origins: [] } });
  const response = await anonymous.get("/admin/products/export");
  expect(response.status()).toBe(401);
  expect(await response.text()).not.toContain("slug,name_ar");
  await anonymous.dispose();
});
