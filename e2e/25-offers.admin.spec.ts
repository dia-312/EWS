import { expect, test } from "./fixtures";

const SLUG = "samsung-galaxy-a55"; // regular price 1,450

/** A "YYYY-MM-DDTHH:mm" value a number of days from now (the exact zone does not matter for day offsets). */
function inDays(days: number) {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 16);
}

const offerRow = (page: import("@playwright/test").Page, label: string) => page.getByRole("row", { name: new RegExp(label) });

async function storefront(page: import("@playwright/test").Page) {
  await page.goto(`/en/products/${SLUG}`);
}

test("an offer goes from creation to the storefront, through its whole life", async ({ page, request }) => {
  const label = `E2E Deal ${Date.now().toString(36)}`;

  // ---- the seeded offer is listed as live
  await page.goto("/admin/offers");
  await expect(page.getByRole("heading", { name: "Offers" })).toBeVisible();
  await expect(page.getByRole("row", { name: /Sony WH-1000XM5/ })).toContainText("Live");

  // ---- validation: the offer must be cheaper, and the period must make sense
  await page.getByRole("link", { name: "Add offer" }).click();
  await expect(page.getByRole("heading", { name: "New offer" })).toBeVisible();
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("This field is required.").first()).toBeVisible();

  const galaxy = await page.locator("#product_id option", { hasText: "Samsung Galaxy A55" }).getAttribute("value");
  await page.getByLabel("Product", { exact: true }).selectOption(galaxy!);
  await page.getByLabel(/Offer price/).fill("1500");
  await expect(page.getByText("The offer price must be lower than the old price.").first()).toBeVisible();
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("The offer price must be lower than the old price.").first()).toBeVisible();

  await page.getByLabel(/Offer price/).fill("1305");
  await expect(page.getByText("Discount: 10%")).toBeVisible();
  await page.getByLabel("Starts at").fill(inDays(1));
  await page.getByLabel("Ends at").fill(inDays(0));
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("The end time must be after the start time.")).toBeVisible();

  // ---- create it for real: live from now, ending in three days
  await page.getByLabel("Starts at").fill("");
  await page.getByLabel("Ends at").fill(inDays(3));
  await page.getByLabel("Offer name (English)").fill(label);
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page).toHaveURL(/\/admin\/offers\?saved=created/);
  await expect(page.getByText("Offer added.")).toBeVisible();
  await expect(offerRow(page, label)).toContainText("Live");
  await expect(offerRow(page, label)).toContainText("−10%");

  // ---- visitors see the new price, the old one struck through, a badge and a countdown
  await storefront(page);
  await expect(page.locator("main del").first()).toContainText("1,450");
  await expect(page.getByText("SALE 10%")).toBeVisible();
  await expect(page.getByText(label)).toBeVisible(); // the offer's name above the price
  await expect(page.locator("main").getByText("1,305").first()).toBeVisible();
  await expect(page.locator("time")).toBeVisible();
  await page.goto("/en/products?sale=1");
  await expect(page.locator("main article")).toHaveCount(2);
  await page.goto("/en");
  await expect(page.getByRole("region", { name: "Special offers" }).locator("article", { hasText: "Samsung Galaxy A55" })).toBeVisible();

  // ---- editing keeps the offer and changes what visitors pay
  await page.goto("/admin/offers");
  await offerRow(page, label).getByRole("link", { name: "Edit" }).click();
  await expect(page.getByLabel("Product")).toHaveValue(/.+/);
  await expect(page.getByLabel(/Offer price/)).toHaveValue("1305");
  await page.getByLabel(/Offer price/).fill("1250");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Changes saved.")).toBeVisible();
  await storefront(page);
  await expect(page.getByText("SALE 14%")).toBeVisible();

  // ---- deactivating hides it everywhere, without deleting it
  await page.goto("/admin/offers");
  await offerRow(page, label).getByRole("button", { name: "Deactivate" }).click();
  await expect(offerRow(page, label)).toContainText("Inactive");
  await storefront(page);
  await expect(page.locator("main del")).toHaveCount(0);
  await expect(page.getByText(/^SALE/)).toHaveCount(0);
  await page.goto("/en/products?sale=1");
  await expect(page.locator("main article")).toHaveCount(1);

  // ---- scheduled: active but not started yet, so visitors do not see it
  await page.goto("/admin/offers");
  await offerRow(page, label).getByRole("link", { name: "Edit" }).click();
  await page.getByLabel("Starts at").fill(inDays(1));
  await page.getByLabel("Ends at").fill(inDays(5));
  await page.getByLabel("Offer is active").check();
  await page.getByRole("button", { name: "Save" }).click();
  await expect(offerRow(page, label)).toContainText("Scheduled");
  await storefront(page);
  await expect(page.locator("main del")).toHaveCount(0);

  // ---- expired: its end has passed
  await page.goto("/admin/offers");
  await offerRow(page, label).getByRole("link", { name: "Edit" }).click();
  await page.getByLabel("Starts at").fill(inDays(-3));
  await page.getByLabel("Ends at").fill(inDays(-1));
  await page.getByRole("button", { name: "Save" }).click();
  await expect(offerRow(page, label)).toContainText("Expired");
  await storefront(page);
  await expect(page.locator("main del")).toHaveCount(0);

  // ---- status filters
  await page.getByRole("link", { name: /^Expired \(/ }).click();
  await expect(page).toHaveURL(/status=expired/);
  await expect(offerRow(page, label)).toBeVisible();
  await expect(page.getByRole("row", { name: /Sony WH-1000XM5/ })).toHaveCount(0);

  // ---- delete through the confirmation dialog
  const row = offerRow(page, label);
  await row.getByRole("button", { name: "Delete", exact: true }).click();
  await row.getByRole("dialog").getByRole("button", { name: "Yes, delete" }).click();
  await expect(offerRow(page, label)).toHaveCount(0);

  // the product is back at its regular price
  await storefront(page);
  await expect(page.locator("main").getByText("1,450").first()).toBeVisible();
  expect((await request.get(`/en/products/${SLUG}`)).status()).toBe(200);
});
