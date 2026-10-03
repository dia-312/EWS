import { expect, test } from "./fixtures";

type Page = import("@playwright/test").Page;

const savedRecent = (page: Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem("ews-shop") ?? "{}").state?.recent ?? []);

test.describe("share", () => {
  test("uses the phone's share sheet when the browser has one", async ({ page }) => {
    await page.addInitScript(() => {
      (window as unknown as { shared: unknown[] }).shared = [];
      navigator.share = async (data) => {
        (window as unknown as { shared: unknown[] }).shared.push(data);
      };
    });
    await page.goto("/en/products/iphone-15");
    await page.getByRole("button", { name: "Share" }).click();

    const shared = await page.evaluate(() => (window as unknown as { shared: { url: string; title: string }[] }).shared);
    expect(shared).toHaveLength(1);
    expect(shared[0].url).toMatch(/\/en\/products\/iphone-15$/);
    expect(shared[0].title).toBe("iPhone 15");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("falls back to a dialog with copy-link and share links", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "share", { value: undefined, configurable: true });
    });
    await page.goto("/en/products/iphone-15");
    await page.getByRole("button", { name: "Share" }).click();

    const dialog = page.getByRole("dialog", { name: "Share this product" });
    await expect(dialog).toBeVisible();
    const link = await dialog.getByLabel("Product link").inputValue();
    expect(link).toMatch(/\/en\/products\/iphone-15$/);

    await expect(dialog.getByRole("link", { name: "WhatsApp" })).toHaveAttribute("href", /^https:\/\/wa\.me\/\?text=/);
    await expect(dialog.getByRole("link", { name: "Facebook" })).toHaveAttribute("href", /facebook\.com\/sharer/);
    await expect(dialog.getByRole("link", { name: "Telegram" })).toHaveAttribute("href", /t\.me\/share/);
    await expect(dialog.getByRole("link", { name: "Email" })).toHaveAttribute("href", /^mailto:/);

    await dialog.getByRole("button", { name: "Copy link" }).click();
    await expect(page.getByRole("alert")).toHaveText("Link copied.");
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(link);

    await dialog.getByRole("button", { name: "Close" }).click();
    await expect(dialog).toBeHidden();
  });
});

test.describe("QR code", () => {
  test("a product page can show a QR code of its own address", async ({ page }) => {
    await page.goto("/en/products/iphone-15");
    await page.getByRole("button", { name: "QR code" }).click();

    const dialog = page.getByRole("dialog", { name: "QR code" });
    await expect(dialog).toBeVisible();
    const image = dialog.getByRole("img", { name: "QR code for iPhone 15" });
    await expect(image.locator("svg path")).toHaveCount(1);
    await expect(image).toHaveAttribute("data-qr-url", /\/en\/products\/iphone-15$/);
  });
});

test.describe("recently viewed", () => {
  test("remembers products, newest first, without repeats, and can be cleared", async ({ page }) => {
    await page.goto("/en");
    await expect(page.locator("[data-recently-viewed]")).toHaveCount(0);

    await page.goto("/en/products/iphone-15");
    // nothing to show yet: the current product is never listed on its own page
    await expect(page.locator("[data-recently-viewed]")).toHaveCount(0);
    await page.goto("/en/products/sony-wh-1000xm5");
    const section = page.locator("[data-recently-viewed]");
    await expect(section.getByRole("heading", { name: "Recently viewed" })).toBeVisible();
    await expect(section.locator("article")).toHaveCount(1);
    await expect(section.locator("article", { hasText: "iPhone 15" })).toBeVisible();

    // viewing the first one again moves it to the front without duplicating it
    await page.goto("/en/products/iphone-15");
    await expect(page.locator("[data-recently-viewed] article", { hasText: "Sony WH-1000XM5" })).toBeVisible();
    await expect.poll(async () => (await savedRecent(page)).length).toBe(2);

    // survives a reload and appears on the home page
    await page.goto("/en");
    const home = page.locator("[data-recently-viewed]");
    await expect(home.locator("article")).toHaveCount(2);
    await expect(home.locator("article").first()).toContainText("iPhone 15");

    await home.getByRole("button", { name: "Clear" }).click();
    await expect(page.locator("[data-recently-viewed]")).toHaveCount(0);
    expect(await savedRecent(page)).toEqual([]);
  });

  test("forgets products the shop no longer shows", async ({ page }) => {
    await page.goto("/en");
    await page.evaluate(() => {
      localStorage.setItem(
        "ews-shop",
        JSON.stringify({ state: { favorites: [], compare: [], recent: ["00000000-0000-4000-8000-000000000000"] }, version: 0 }),
      );
    });
    await page.reload();
    await expect.poll(() => savedRecent(page)).toEqual([]);
    await expect(page.locator("[data-recently-viewed]")).toHaveCount(0);
  });
});
