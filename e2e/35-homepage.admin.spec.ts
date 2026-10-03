import { expect, test } from "./fixtures";

type Page = import("@playwright/test").Page;

/** Section names in the admin list, top to bottom. */
const adminOrder = (page: Page) => page.locator("[data-section-name]").allInnerTexts();

/** The labelled sections of the English storefront homepage, top to bottom. */
async function publicOrder(page: Page) {
  await page.goto("/en");
  return page.locator("main section[aria-label]").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("aria-label")));
}

const row = (page: Page, name: string) => page.locator("ol > li", { hasText: name });

test("the owner reorders, hides, edits, removes and re-adds homepage sections", async ({ page }) => {
  test.setTimeout(150_000);

  // ---- the default layout is listed in order
  await page.goto("/admin/homepage");
  await expect(page.getByRole("heading", { name: "Homepage" })).toBeVisible();
  const names = await adminOrder(page);
  expect(names[0]).toBe("Hero banner");
  expect(names).toEqual(
    expect.arrayContaining(["Categories", "Special offers", "New arrivals", "Best sellers", "Featured products", "Deal of the day", "Why choose us", "Contact"]),
  );

  // ---- reordering: move "Featured products" above "Best sellers"; the storefront follows
  await page.getByRole("button", { name: "Move up: Featured products" }).click();
  await expect(async () => {
    const order = await adminOrder(page);
    expect(order.indexOf("Featured products")).toBeLessThan(order.indexOf("Best sellers"));
  }).toPass();

  const order = await publicOrder(page);
  expect(order.indexOf("Featured products")).toBeGreaterThanOrEqual(0);
  expect(order.indexOf("Featured products")).toBeLessThan(order.indexOf("Best sellers"));

  // the first section cannot move up, the last cannot move down
  await page.goto("/admin/homepage");
  await expect(page.getByRole("button", { name: "Move up: Hero banner" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Move down: Contact" })).toBeDisabled();

  // ---- hiding removes a section from the storefront, showing brings it back
  await page.getByRole("button", { name: "Hide: Special offers" }).click();
  await expect(row(page, "Special offers")).toContainText("Hidden");
  expect(await publicOrder(page)).not.toContain("Special offers");

  await page.goto("/admin/homepage");
  await page.getByRole("button", { name: "Show: Special offers" }).click();
  await expect(row(page, "Special offers")).toContainText("Visible");
  expect(await publicOrder(page)).toContain("Special offers");

  // ---- editing: validation, a custom title in both languages, fewer products
  await page.goto("/admin/homepage");
  await page.getByRole("link", { name: "Edit: New arrivals" }).click();
  await expect(page.getByRole("heading", { name: "Edit section: New arrivals" })).toBeVisible();
  await page.getByLabel("Title (English)").fill("Fresh in store");
  await page.getByLabel("Title (Arabic)").fill("وصل للتو");
  await page.getByLabel("Number of products").fill("1");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Enter a whole number within the allowed range.")).toBeVisible();

  await page.getByLabel("Number of products").fill("4");
  await expect(page.getByText("Enter a whole number within the allowed range.")).toHaveCount(0); // clears while editing
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page).toHaveURL(/\/admin\/homepage\?saved=1/);
  await expect(page.getByText(/Section saved/)).toBeVisible();

  await page.goto("/en");
  const fresh = page.getByRole("region", { name: "Fresh in store" });
  await expect(fresh).toBeVisible();
  await expect(fresh.locator("article")).toHaveCount(4);
  await page.goto("/ar");
  await expect(page.getByRole("region", { name: "وصل للتو" })).toBeVisible();

  // ---- an empty title goes back to the default
  await page.goto("/admin/homepage");
  await page.getByRole("link", { name: "Edit: New arrivals" }).click();
  await page.getByLabel("Title (English)").fill("");
  await page.getByLabel("Title (Arabic)").fill("");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page).toHaveURL(/saved=1/);
  await page.goto("/en");
  await expect(page.getByRole("region", { name: "New arrivals" })).toBeVisible();

  // ---- the hero title is the page heading; hero has no product count
  await page.goto("/admin/homepage");
  await page.getByRole("link", { name: "Edit: Hero banner" }).click();
  await expect(page.getByLabel("Number of products")).toHaveCount(0);
  await page.getByLabel("Title (English)").fill("Welcome to the E2E store");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page).toHaveURL(/saved=1/);
  await page.goto("/en");
  await expect(page.getByRole("heading", { level: 1, name: "Welcome to the E2E store" })).toBeVisible();

  // ---- delete a section, then add it back from the list of missing ones
  await page.goto("/admin/homepage");
  await row(page, "Why choose us").getByRole("button", { name: "Delete", exact: true }).click();
  await row(page, "Why choose us").getByRole("dialog").getByRole("button", { name: "Yes, delete" }).click();
  await expect(row(page, "Why choose us")).toHaveCount(0);
  expect(await publicOrder(page)).not.toContain("Why choose us");

  await page.goto("/admin/homepage");
  await page.getByLabel("Section type").selectOption({ label: "Why choose us" });
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/homepage\/[0-9a-f-]{36}\?created=1/);
  await expect(page.getByText("Section added.")).toBeVisible();

  await page.goto("/admin/homepage");
  expect((await adminOrder(page)).at(-1)).toBe("Why choose us"); // new sections go to the end
  expect(await publicOrder(page)).toContain("Why choose us");
  await expect(page.getByText("Every section type is already on the page.")).toBeVisible();
});
