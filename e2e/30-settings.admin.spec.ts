import { expect, makePng, test } from "./fixtures";

test("store settings validate, save and persist", async ({ page }) => {
  await page.goto("/admin/settings");
  await expect(page.getByRole("heading", { name: "Store settings" })).toBeVisible();

  // A local number without a country code cannot be used for wa.me links.
  await page.getByLabel("WhatsApp number").fill("0591234567");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("This value is not valid.").first()).toBeVisible();

  // Social links must be https links on the right site.
  await page.getByLabel("WhatsApp number").fill("+970 59 123 4567");
  await page.getByLabel("Instagram link").fill("http://instagram.com/e2e");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("This value is not valid.").first()).toBeVisible();

  // Working hours: a period needs both an opening and a closing time.
  await page.getByLabel("Instagram link").fill("https://instagram.com/e2e");
  // (the seed already gives Saturday 09:00-21:00, so clear the closing time first)
  const saturday = page.locator("li", { hasText: "Saturday" });
  await saturday.getByLabel("Closed").uncheck();
  await page.getByLabel("Saturday - Opens 1").fill("09:00");
  await page.getByLabel("Saturday - Closes 1").fill("");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Check the working hours")).toBeVisible();

  await page.getByLabel("Saturday - Closes 1").fill("21:00");
  await page.getByLabel("Store name").fill("EWS Electronics E2E");
  await page.getByLabel("Phone number").fill("+970 59 000 0000");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Settings saved.")).toBeVisible();

  // Everything persisted, and the WhatsApp number was normalized for wa.me.
  await page.reload();
  await expect(page.getByLabel("Store name")).toHaveValue("EWS Electronics E2E");
  await expect(page.getByLabel("WhatsApp number")).toHaveValue("970591234567");
  await expect(page.getByLabel("Saturday - Opens 1")).toHaveValue("09:00");
  await expect(page.getByLabel("Saturday - Closes 1")).toHaveValue("21:00");

  // The public site reads the new name.
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "EWS Electronics E2E" })).toBeVisible();

  // Restore the original name.
  await page.goto("/admin/settings");
  await page.getByLabel("Store name").fill("EWS Electronics");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Settings saved.")).toBeVisible();
});

test("the store logo can be uploaded, shown publicly and removed", async ({ page, request }) => {
  await page.goto("/admin/settings");
  const logo = page.locator('section[aria-labelledby="logo-title"]');
  await expect(logo.getByText("No logo")).toBeVisible();

  await logo.locator('input[type="file"]').setInputFiles({
    name: "logo.png",
    mimeType: "image/png",
    buffer: makePng(256, 256, [20, 120, 60]),
  });

  const image = logo.locator("img");
  await expect(image).toBeVisible();
  const src = await image.getAttribute("src");
  expect(src).toContain("/store-logos/");
  expect((await request.get(src!)).status()).toBe(200);

  await logo.getByRole("button", { name: "Delete", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Yes, delete" }).click();
  await expect(logo.getByText("No logo")).toBeVisible();
  expect((await request.get(src!)).status(), "the file is removed from storage").toBeGreaterThanOrEqual(400);
});
