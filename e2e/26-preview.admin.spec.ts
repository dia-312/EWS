import { expect, test, unique } from "./fixtures";

type Sent = { type: string };

test("the owner can preview a hidden product, and nobody else can see it", async ({ page, playwright, baseURL }) => {
  const slug = unique("e2e-preview");

  // a hidden product (new products always start hidden), made through the import page
  await page.goto("/admin/products/import");
  await page.locator("#import-file").setInputFiles({
    name: "one.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(`slug,name_ar,name_en,category,price\r\n${slug},منتج معاينة,Preview Gadget,mobiles,10\r\n`, "utf8"),
  });
  await page.getByRole("button", { name: "Check the file" }).click();
  await page.getByRole("button", { name: "Import 1 products" }).click();
  await expect(page.locator("[data-import-done]")).toContainText("1 created");

  // ---- the list offers a Preview link that carries the preview flag
  await page.goto("/admin/products");
  const row = page.getByRole("row", { name: new RegExp(slug) });
  await expect(row.getByRole("link", { name: "Preview" })).toHaveAttribute("href", new RegExp(`/ar/products/${slug}\\?preview=1$`));

  // ---- the admin sees it, with a banner, and nothing is counted as a visit
  const tracked: Sent[] = [];
  page.on("request", (request) => {
    if (request.url().endsWith("/api/track")) tracked.push(request.postDataJSON() as Sent);
  });
  await page.goto(`/en/products/${slug}?preview=1`);
  await expect(page.getByRole("heading", { level: 1, name: "Preview Gadget" })).toBeVisible();
  await expect(page.locator("[data-preview-banner]")).toContainText("this product is hidden");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await page.waitForLoadState("networkidle");
  expect(tracked.filter((event) => event.type === "product_view")).toEqual([]);

  // ---- without the flag it is still hidden, even for the admin
  expect((await page.request.get(`/en/products/${slug}`)).status()).toBe(404);

  // ---- a visitor cannot use the flag
  const visitor = await playwright.request.newContext({ baseURL, storageState: { cookies: [], origins: [] } });
  expect((await visitor.get(`/en/products/${slug}?preview=1`)).status()).toBe(404);
  await visitor.dispose();

  // ---- the editor has the same preview button
  await page.goto("/admin/products");
  await row.getByRole("link", { name: "Edit" }).click();
  await expect(page.getByRole("link", { name: "Preview" })).toHaveAttribute("href", new RegExp(`${slug}\\?preview=1$`));

  // ---- clean up
  await page.goto("/admin/products");
  await row.getByRole("button", { name: "Delete", exact: true }).click();
  await row.getByRole("dialog").getByRole("button", { name: "Yes, delete" }).click();
  await expect(row).toHaveCount(0);
});
