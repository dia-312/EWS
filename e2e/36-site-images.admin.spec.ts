import { expect, makePng, test } from "./fixtures";

type Page = import("@playwright/test").Page;

const picture = (name: string, colour: [number, number, number]) => ({
  name,
  mimeType: "image/png",
  buffer: makePng(400, 200, colour),
});

async function removePicture(page: Page, section: string) {
  const box = page.locator(`[data-site-image='${section}']`);
  await box.getByRole("button", { name: "Delete", exact: true }).click();
  await box.getByRole("dialog").getByRole("button", { name: "Yes, delete" }).click();
  await expect(box.getByText("No picture")).toBeVisible();
}

test("the homepage hero can have a picture, and loses it again when removed", async ({ page, request }) => {
  await page.goto("/admin/settings");
  const box = page.locator("[data-site-image='hero']");
  await expect(box.getByText("No picture")).toBeVisible();

  await box.locator('input[type="file"]').setInputFiles(picture("hero.png", [30, 90, 160]));
  await expect(box.locator("img")).toBeVisible();
  const src = await box.locator("img").getAttribute("src");
  expect(src).toContain("/store-banners/");
  expect((await request.get(src!)).status(), "the stored picture is publicly readable").toBe(200);

  await page.goto("/en");
  const hero = page.locator("[data-hero]");
  await expect(hero).toHaveAttribute("data-hero", "image");
  await expect(hero.locator("img")).toHaveAttribute("src", src!);
  // the heading stays on top of the picture and readable
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  await page.goto("/admin/settings");
  await removePicture(page, "hero");
  await page.goto("/en");
  await expect(page.locator("[data-hero]")).toHaveAttribute("data-hero", "plain");
  expect((await request.get(src!)).status(), "the old file is deleted").toBeGreaterThanOrEqual(400);
});

test("a category picture replaces the first letter on the homepage", async ({ page }) => {
  await page.goto("/admin/categories");
  await page.getByRole("row", { name: /Mobile Phones/ }).getByRole("link", { name: "Edit" }).click();

  const box = page.locator("[data-site-image='category']");
  await box.locator('input[type="file"]').setInputFiles(picture("phones.png", [200, 60, 60]));
  await expect(box.locator("img")).toBeVisible();
  const src = await box.locator("img").getAttribute("src");
  expect(src).toContain("/category-images/");

  await page.goto("/en");
  const card = page.getByRole("link", { name: "Mobile Phones" });
  await expect(card.locator("img")).toHaveAttribute("src", src!);

  await page.goBack();
  await page.reload();
  await removePicture(page, "category");
  await page.goto("/en");
  await expect(page.getByRole("link", { name: "Mobile Phones" }).locator("img")).toHaveCount(0);
});

test("a live offer's banner shows in the offers section and opens its product", async ({ page }) => {
  await page.goto("/admin/offers");
  await page.getByRole("row", { name: /Sony WH-1000XM5/ }).getByRole("link", { name: "Edit" }).click();

  const box = page.locator("[data-site-image='offer']");
  await box.locator('input[type="file"]').setInputFiles(picture("offer.png", [60, 160, 90]));
  await expect(box.locator("img")).toBeVisible();

  await page.goto("/en");
  const banners = page.locator("[data-offer-banners]");
  await expect(banners).toBeVisible();
  await expect(banners.locator("a")).toHaveAttribute("href", "/en/products/sony-wh-1000xm5");

  await page.goto("/admin/offers");
  await page.getByRole("row", { name: /Sony WH-1000XM5/ }).getByRole("link", { name: "Edit" }).click();
  await removePicture(page, "offer");
  await page.goto("/en");
  await expect(page.locator("[data-offer-banners]")).toHaveCount(0);
});

test("a promotional banner has a picture and a safe link, and can be removed", async ({ page }) => {
  await page.goto("/admin/homepage");
  await page.getByRole("button", { name: "Add a promotional banner" }).click();
  await expect(page).toHaveURL(/\/admin\/homepage\/[0-9a-f-]{36}\?created=1/);
  const editUrl = page.url();

  // a banner without a picture is not shown
  await page.goto("/en");
  await expect(page.locator("[data-banner]")).toHaveCount(0);

  await page.goto(editUrl);
  await page.locator("[data-site-image='banner'] input[type='file']").setInputFiles(picture("banner.png", [160, 90, 30]));
  await expect(page.locator("[data-site-image='banner'] img")).toBeVisible();

  // links that could run code or leave the site oddly are refused
  await page.getByLabel("Link (optional)").fill("javascript:alert(1)");
  await page.getByRole("button", { name: "Save link" }).click();
  await expect(page.getByText("Use a path that starts with /")).toBeVisible();

  await page.getByLabel("Link (optional)").fill("/products?sale=1");
  await page.getByRole("button", { name: "Save link" }).click();
  await expect(page.getByText("Link saved.")).toBeVisible();

  await page.getByLabel("Title (English)", { exact: true }).fill("Weekend deals");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page).toHaveURL(/saved=1/);

  await page.goto("/en");
  const banner = page.locator("[data-banner]");
  await expect(banner).toBeVisible();
  await expect(banner.getByText("Weekend deals")).toBeVisible();
  await expect(page.getByRole("region", { name: "Weekend deals" }).getByRole("link")).toHaveAttribute("href", "/en/products?sale=1");

  // remove the banner section again
  await page.goto("/admin/homepage");
  const row = page.locator("ol > li", { hasText: "Promotional banner" });
  await row.getByRole("button", { name: "Delete", exact: true }).click();
  await row.getByRole("dialog").getByRole("button", { name: "Yes, delete" }).click();
  await expect(page.locator("ol > li", { hasText: "Promotional banner" })).toHaveCount(0);
});
