import { expect, test } from "./fixtures";

type Page = import("@playwright/test").Page;

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const ANON_KEY = process.env.SUPABASE_ANON_KEY ?? "";
const FAKE_ID = "00000000-0000-4000-8000-000000000000";

const card = (page: Page, name: string) => page.locator("main article", { hasText: name });

/** Product ids by slug, read the same way a visitor's browser could (anonymous REST). */
async function idsBySlug(slugs: string[]) {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/products?select=id,slug&slug=in.(${slugs.join(",")})`,
    { headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` } },
  );
  const rows = (await response.json()) as { id: string; slug: string }[];
  return Object.fromEntries(rows.map((row) => [row.slug, row.id]));
}

const savedState = (page: Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem("ews-shop") ?? "{}").state ?? {});

test.describe("favorites", () => {
  test("a visitor saves products without an account and they persist", async ({ page }) => {
    await page.goto("/en/products");
    const iphone = card(page, "iPhone 15");
    const heart = iphone.getByRole("button", { name: "Add to favorites: iPhone 15" });

    await expect(heart).toHaveAttribute("aria-pressed", "false");
    await heart.click();
    await expect(iphone.getByRole("button", { name: "Remove from favorites: iPhone 15" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("link", { name: "Favorites (1)" })).toBeVisible();

    // still saved after a reload (kept in this browser)
    await page.reload();
    await expect(card(page, "iPhone 15").getByRole("button", { name: "Remove from favorites: iPhone 15" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("link", { name: "Favorites (1)" })).toBeVisible();

    // and on the product page, with a text label
    await page.goto("/en/products/iphone-15");
    await expect(page.getByRole("button", { name: "Saved" })).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "Saved" }).click();
    await expect(page.getByRole("button", { name: "Save", exact: true })).toHaveAttribute("aria-pressed", "false");
    await expect(page.getByRole("link", { name: "Favorites", exact: true })).toBeVisible();
  });

  test("the favorites page lists the saved products and lets the visitor remove them", async ({ page }) => {
    await page.goto("/en/favorites");
    await expect(page.getByText("No favorites yet")).toBeVisible();

    await page.goto("/en/products");
    await card(page, "iPhone 15").getByRole("button", { name: /Add to favorites/ }).click();
    await card(page, "Sony WH-1000XM5").getByRole("button", { name: /Add to favorites/ }).click();

    await page.getByRole("link", { name: "Favorites (2)" }).click();
    await expect(page).toHaveURL(/\/en\/favorites$/);
    await expect(page.getByRole("status").filter({ hasText: "saved product" })).toHaveText("2 saved products");
    await expect(card(page, "iPhone 15")).toBeVisible();
    await expect(card(page, "Sony WH-1000XM5")).toBeVisible();
    // the live offer shows here too
    await expect(card(page, "Sony WH-1000XM5").locator("del")).toContainText("1,350");

    await card(page, "iPhone 15").getByRole("button", { name: "Remove from favorites: iPhone 15" }).click();
    await expect(card(page, "iPhone 15")).toHaveCount(0);
    await expect(page.getByRole("status").filter({ hasText: "saved product" })).toHaveText("1 saved product");

    await page.getByRole("button", { name: "Clear all" }).click();
    await expect(page.getByText("No favorites yet")).toBeVisible();
    expect((await savedState(page)).favorites).toEqual([]);
  });

  test("saved products that no longer exist are forgotten", async ({ page }) => {
    const ids = await idsBySlug(["iphone-15"]);
    await page.goto("/en");
    await page.evaluate(
      ([real, fake]) =>
        localStorage.setItem("ews-shop", JSON.stringify({ state: { favorites: [real, fake], compare: [] }, version: 1 })),
      [ids["iphone-15"], FAKE_ID],
    );

    await page.goto("/en/favorites");
    await expect(card(page, "iPhone 15")).toBeVisible();
    await expect.poll(async () => (await savedState(page)).favorites).toEqual([ids["iphone-15"]]);
  });

  test("the same saved list shows in Arabic", async ({ page }) => {
    await page.goto("/en/products");
    await card(page, "iPhone 15").getByRole("button", { name: /Add to favorites/ }).click();

    await page.goto("/ar/favorites");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.getByRole("heading", { name: "المفضلة" })).toBeVisible();
    await expect(card(page, "آيفون 15")).toBeVisible();
  });

  test("damaged saved data is ignored instead of breaking the site", async ({ page }) => {
    await page.goto("/en");
    await page.evaluate(() => localStorage.setItem("ews-shop", "{not json"));
    await page.goto("/en/products");
    await expect(card(page, "iPhone 15")).toBeVisible();
    await expect(page.getByRole("link", { name: "Favorites", exact: true })).toBeVisible();

    await page.evaluate(() => localStorage.setItem("ews-shop", JSON.stringify({ state: { favorites: ["x", 5, null], compare: "no" }, version: 1 })));
    await page.reload();
    await expect(page.getByRole("link", { name: "Favorites", exact: true })).toBeVisible();
  });

  test("the products API returns public cards for known ids only", async ({ request }) => {
    const ids = await idsBySlug(["iphone-15", "sony-wh-1000xm5"]);

    const found = await request.get(`/api/products?ids=${ids["iphone-15"]},${ids["sony-wh-1000xm5"]},${FAKE_ID},junk&locale=en`);
    expect(found.status()).toBe(200);
    expect(found.headers()["cache-control"]).toContain("max-age=30");
    const body = (await found.json()) as { items: { slug: string; offer_price: number | null }[]; currency: string };
    expect(body.items.map((item) => item.slug).sort()).toEqual(["iphone-15", "sony-wh-1000xm5"]);
    expect(body.currency).toBe("ILS");
    expect(body.items.find((item) => item.slug === "sony-wh-1000xm5")?.offer_price).toBe(1150);

    expect(await (await request.get("/api/products")).json()).toEqual({ items: [] });
    expect(await (await request.get("/api/products?ids=junk,123")).json()).toEqual({ items: [] });
  });
});

test.describe("compare", () => {
  async function pick(page: Page, names: string[]) {
    for (const name of names) {
      await card(page, name).getByRole("button", { name: new RegExp(`Add to compare: ${name}`) }).click();
    }
  }

  test("two products are compared side by side, with dashes for missing specs", async ({ page }) => {
    await page.goto("/en/products");
    await pick(page, ["iPhone 15"]);

    const tray = page.getByRole("complementary", { name: "Products selected for comparison" });
    await expect(tray).toContainText("1 of 4 selected to compare");
    await expect(tray).toContainText("Pick at least one more");
    await expect(tray.getByRole("link", { name: "Compare now" })).toHaveCount(0);

    await pick(page, ["Sony WH-1000XM5"]);
    await expect(tray).toContainText("2 of 4 selected to compare");
    await tray.getByRole("link", { name: "Compare now" }).click();

    await expect(page).toHaveURL(/\/en\/compare\?ids=[0-9a-f-]{36},[0-9a-f-]{36}$/);
    await expect(page.getByRole("heading", { name: "Compare products" })).toBeVisible();

    const table = page.getByRole("table", { name: "Comparison of the selected products" });
    await expect(table.getByRole("columnheader", { name: /iPhone 15/ })).toBeVisible();
    await expect(table.getByRole("columnheader", { name: /Sony WH-1000XM5/ })).toBeVisible();

    // prices use the live offer for Sony
    await expect(table.getByRole("row", { name: /^Price/ })).toContainText("1,150");
    await expect(table.getByRole("row", { name: /^Price/ })).toContainText("3,200");

    // each product only has some specifications; the other cell shows a dash
    const display = table.getByRole("row", { name: /^Display/ });
    await expect(display).toContainText("6.1");
    await expect(display.getByLabel("Not available")).toHaveCount(1);
    const battery = table.getByRole("row", { name: /^Battery life/ });
    await expect(battery).toContainText("Up to 30 hours");
    await expect(battery.getByLabel("Not available")).toHaveCount(1);
    // known keys come first in their usual order
    const labels = await table.locator("tbody th[scope=row]").allInnerTexts();
    expect(labels.indexOf("Display")).toBeLessThan(labels.indexOf("RAM"));

    // the tray is not shown on the comparison page itself
    await expect(page.getByRole("complementary", { name: "Products selected for comparison" })).toHaveCount(0);

    // removing one leaves a single column and a hint
    await table.getByRole("button", { name: "Remove iPhone 15 from the comparison" }).click();
    await expect(page).toHaveURL(/\/en\/compare\?ids=[0-9a-f-]{36}$/);
    await expect(page.getByText("Pick at least two products")).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /iPhone 15/ })).toHaveCount(0);
  });

  test("at most four products can be compared, and the visitor is told", async ({ page }) => {
    await page.goto("/en/products");
    await pick(page, ["iPhone 15", "Sony WH-1000XM5", "JBL Tune 520BT", "Samsung 55"]);

    const tray = page.getByRole("complementary", { name: "Products selected for comparison" });
    await expect(tray).toContainText("4 of 4 selected to compare");

    await card(page, "LG 43").getByRole("button", { name: /Add to compare/ }).click();
    await expect(page.getByText("You can compare up to 4 products")).toBeVisible();
    await expect(tray).toContainText("4 of 4 selected to compare");
    await expect(card(page, "LG 43").getByRole("button", { name: /Add to compare/ })).toHaveAttribute("aria-pressed", "false");

    // removing one frees a place
    await card(page, "iPhone 15").getByRole("button", { name: /Remove from compare/ }).click();
    await card(page, "LG 43").getByRole("button", { name: /Add to compare/ }).click();
    await expect(card(page, "LG 43").getByRole("button", { name: /Remove from compare/ })).toHaveAttribute("aria-pressed", "true");

    await tray.getByRole("button", { name: "Clear" }).click();
    await expect(tray).toHaveCount(0);
  });

  test("opening the comparison page without ids uses the saved list", async ({ page }) => {
    await page.goto("/en/compare");
    await expect(page.getByText("Nothing to compare yet")).toBeVisible();

    const ids = await idsBySlug(["iphone-15", "jbl-tune-520bt"]);
    await page.evaluate(
      (list) => localStorage.setItem("ews-shop", JSON.stringify({ state: { favorites: [], compare: list }, version: 1 })),
      [ids["iphone-15"], ids["jbl-tune-520bt"]],
    );
    await page.goto("/en/compare");
    await expect(page).toHaveURL(new RegExp(`/en/compare\\?ids=${ids["iphone-15"]},${ids["jbl-tune-520bt"]}$`));
    await expect(page.getByRole("columnheader", { name: /JBL Tune 520BT/ })).toBeVisible();
  });

  test("a comparison link works for someone with nothing saved, and is not indexed", async ({ browser, baseURL }) => {
    const ids = await idsBySlug(["iphone-15", "xiaomi-redmi-note-13", "samsung-galaxy-a55"]);
    const context = await browser.newContext({ baseURL });
    const page = await context.newPage();
    await page.goto(`/en/compare?ids=${ids["iphone-15"]},${ids["xiaomi-redmi-note-13"]},${ids["samsung-galaxy-a55"]}`);

    await expect(page.getByRole("columnheader")).toHaveCount(4); // the label column + 3 products
    expect(await page.locator('meta[name="robots"]').getAttribute("content")).toContain("noindex");
    await context.close();
  });

  test("products that are gone are handled gracefully", async ({ page }) => {
    await page.goto(`/en/compare?ids=${FAKE_ID}`);
    await expect(page.getByText("The selected products are no longer available")).toBeVisible();

    const ids = await idsBySlug(["iphone-15", "jbl-tune-520bt"]);
    await page.goto(`/en/compare?ids=${ids["iphone-15"]},${FAKE_ID},${ids["jbl-tune-520bt"]},not-an-id`);
    await expect(page.getByRole("columnheader", { name: /iPhone 15/ })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /JBL Tune 520BT/ })).toBeVisible();
  });

  test("the Arabic comparison is right-to-left with Arabic labels", async ({ page }) => {
    const ids = await idsBySlug(["iphone-15", "sony-wh-1000xm5"]);
    await page.goto(`/ar/compare?ids=${ids["iphone-15"]},${ids["sony-wh-1000xm5"]}`);
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.getByRole("heading", { name: "مقارنة المنتجات" })).toBeVisible();
    await expect(page.getByRole("row", { name: /^الشاشة/ })).toContainText("OLED");
    await expect(page.getByRole("row", { name: /^السعر/ })).toBeVisible();
  });

  test.describe("on a phone", () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test("the table scrolls inside its own area, not the whole page", async ({ page }) => {
      const ids = await idsBySlug(["iphone-15", "sony-wh-1000xm5", "jbl-tune-520bt"]);
      await page.goto(`/en/compare?ids=${ids["iphone-15"]},${ids["sony-wh-1000xm5"]},${ids["jbl-tune-520bt"]}`);

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, "the page itself must not scroll sideways").toBeLessThanOrEqual(0);

      const region = page.getByRole("region", { name: /Comparison table/ });
      const [scrollWidth, clientWidth] = await region.evaluate((node) => [node.scrollWidth, node.clientWidth]);
      expect(scrollWidth).toBeGreaterThan(clientWidth); // it does scroll, within the region
      await expect(region).toHaveAttribute("tabindex", "0"); // reachable with the keyboard
    });

    test("the comparison tray and the AI button do not cover each other", async ({ page }) => {
      await page.goto("/en/products");
      await card(page, "iPhone 15").getByRole("button", { name: /Add to compare/ }).click();

      const tray = await page.getByRole("complementary", { name: "Products selected for comparison" }).boundingBox();
      const ai = await page.getByRole("button", { name: "AI Shopping Assistant" }).boundingBox();
      expect(tray && ai).toBeTruthy();
      expect(tray!.x + tray!.width <= ai!.x || ai!.x + ai!.width <= tray!.x, "side by side").toBe(true);
    });
  });
});
