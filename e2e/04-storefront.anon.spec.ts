import { expect, test } from "./fixtures";

const results = (page: import("@playwright/test").Page) => page.getByRole("status").filter({ hasText: /product/ });
const cards = (page: import("@playwright/test").Page) => page.locator("main article");

test.describe("home page", () => {
  test("shows the sections in order with real catalogue data", async ({ page }) => {
    await page.goto("/en");

    const headings = await page.locator("main h1, main h2").allInnerTexts();
    expect(headings).toEqual(
      expect.arrayContaining(["Shop by category", "Special offers", "New arrivals", "Best sellers", "Featured products", "Deal of the day", "Why choose us"]),
    );
    const order = ["Shop by category", "Special offers", "New arrivals", "Best sellers", "Featured products", "Deal of the day", "Why choose us"];
    expect(order.map((title) => headings.indexOf(title))).toEqual([...order.map((title) => headings.indexOf(title))].sort((a, b) => a - b));

    // four seeded categories, each linking to its page
    for (const name of ["Mobile Phones", "Accessories & Headphones", "Home Appliances & TVs"]) {
      await expect(page.getByRole("link", { name }).first()).toBeVisible();
    }

    // the live offer shows the old price struck through and a discount badge
    const offers = page.getByRole("region", { name: "Special offers" });
    const sony = offers.locator("article", { hasText: "Sony WH-1000XM5" });
    await expect(sony).toBeVisible();
    await expect(sony.locator("del")).toContainText("1,350");
    await expect(sony).toContainText("1,150");
    await expect(sony).toContainText("SALE 15%");
  });

  test("offers contact options when the store has contact details", async ({ page }) => {
    await page.goto("/en");
    const whatsapp = page.getByRole("link", { name: "Chat on WhatsApp" }).first();
    await expect(whatsapp).toHaveAttribute("href", /^https:\/\/wa\.me\/970590000000/);
    await expect(page.getByRole("link", { name: "Call us" }).first()).toHaveAttribute("href", "tel:+970590000000");
    await expect(page.getByRole("contentinfo").getByRole("link", { name: "Instagram" })).toHaveAttribute(
      "href",
      "https://instagram.com/e2e-store",
    );
  });

  test("shows whether the store is open, computed in the browser", async ({ page }) => {
    await page.goto("/en");
    await expect(page.getByText(/^(Open|Closed) now$/).first()).toBeVisible();
    await expect(page.getByRole("contentinfo").getByRole("row", { name: /Saturday/ })).toContainText("09:00 - 21:00");
    await expect(page.getByRole("contentinfo").getByRole("row", { name: /Friday/ })).toContainText("Closed");
  });
});

test.describe("language", () => {
  test("switching language keeps the page and the filters", async ({ page }) => {
    await page.goto("/ar/products?sort=price_asc&sale=1");
    await page.getByRole("link", { name: "التبديل إلى English" }).click();
    await expect(page).toHaveURL(/\/en\/products\?sort=price_asc&sale=1$/);
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
    await expect(page.getByRole("heading", { name: "All products" })).toBeVisible();
  });

  test("the Arabic catalogue shows Arabic product names", async ({ page }) => {
    await page.goto("/ar/products");
    await expect(page.locator("main article", { hasText: "آيفون 15" })).toBeVisible();
    await expect(page.getByRole("status").filter({ hasText: "منتج" })).toContainText("12 منتج");
  });
});

test.describe("search, filters and sorting", () => {
  test("the header search finds products regardless of Arabic spelling", async ({ page }) => {
    await page.goto("/ar");
    await page.getByRole("searchbox", { name: "ابحث عن منتج" }).fill("ايفون");
    await page.getByRole("button", { name: "بحث" }).click();
    await expect(page).toHaveURL(/\/ar\/products\?q=/);
    await expect(cards(page)).toHaveCount(1);
    await expect(cards(page).first()).toContainText("آيفون 15");

    // two words in any order, in either language
    await page.goto("/en/products?q=tv+samsung");
    await expect(cards(page)).toHaveCount(1);
    await expect(cards(page).first()).toContainText("Samsung 55");
  });

  test("a search with no match shows an empty state with a way back", async ({ page }) => {
    await page.goto("/en/products?q=zzzzqqq");
    await expect(page.getByText("No matching products")).toBeVisible();
    await page.getByRole("link", { name: "Clear filters" }).click();
    await expect(cards(page)).toHaveCount(12);
  });

  test("filters combine, show as chips and can be removed", async ({ page }) => {
    await page.goto("/en/products");
    await expect(results(page)).toHaveText("12 products");

    const filters = page.getByRole("complementary", { name: "Product filters" });
    await filters.getByLabel("Samsung").check();
    await filters.getByRole("button", { name: "Apply" }).click();
    await expect(page).toHaveURL(/brand=samsung/);
    await expect(cards(page)).toHaveCount(2);
    await expect(page.getByRole("list", { name: "Applied filters" })).toContainText("Samsung");

    // add a price range on top of the brand
    await page.getByRole("complementary", { name: "Product filters" }).getByLabel("From").fill("1500");
    await page.getByRole("complementary", { name: "Product filters" }).getByRole("button", { name: "Apply" }).click();
    await expect(cards(page)).toHaveCount(1);
    await expect(cards(page).first()).toContainText("Samsung 55");

    // removing one chip keeps the other
    await page.getByRole("link", { name: /Remove filter: Samsung/ }).click();
    await expect(page).not.toHaveURL(/brand=/);
    await expect(page).toHaveURL(/min=1500/);
    await expect(results(page)).toHaveText("3 products");

    await page.getByRole("complementary", { name: "Product filters" }).getByRole("link", { name: "Clear all" }).click();
    await expect(cards(page)).toHaveCount(12);
  });

  test("on-sale and availability filters use the live offer and stock", async ({ page }) => {
    await page.goto("/en/products?sale=1");
    await expect(cards(page)).toHaveCount(1);
    await expect(cards(page).first()).toContainText("Sony WH-1000XM5");

    await page.goto("/en/products?availability=out_of_stock");
    await expect(cards(page)).toHaveCount(1);
    await expect(cards(page).first()).toContainText("Out of stock");
  });

  test("sorting orders by the price the visitor actually pays", async ({ page }) => {
    await page.goto("/en/products?sort=price_asc");
    await expect(cards(page).first()).toContainText("Tempered Glass");
    await page.getByRole("link", { name: "Price: high to low" }).click();
    await expect(page).toHaveURL(/sort=price_desc/);
    await expect(cards(page).first()).toContainText("iPhone 15");
    await expect(page.getByRole("link", { name: "Price: high to low" })).toHaveAttribute("aria-current", "true");
  });

  test("a category page lists only its products", async ({ page }) => {
    await page.goto("/en/categories/mobiles");
    await expect(page.getByRole("heading", { name: "Mobile Phones" })).toBeVisible();
    await expect(cards(page)).toHaveCount(3);
    await expect(page.getByRole("navigation", { name: "Breadcrumbs" })).toContainText("All products");

    await page.goto("/en/categories/does-not-exist");
    await expect(page.getByText("Page not found")).toBeVisible();
  });
});

test.describe("product page", () => {
  test("shows price, offer, stock, specs, WhatsApp message and related products", async ({ page }) => {
    await page.goto("/en/products/sony-wh-1000xm5");

    await expect(page.getByRole("heading", { level: 1, name: "Sony WH-1000XM5" })).toBeVisible();
    await expect(page.locator("main del").first()).toContainText("1,350");
    await expect(page.getByText("SALE 15%")).toBeVisible();
    await expect(page.locator("time")).toBeVisible(); // offer countdown
    await expect(page.getByText("Limited stock").first()).toBeVisible();
    await expect(page.getByRole("img", { name: "No product image" })).toBeVisible();

    const specs = page.getByRole("region", { name: "Specifications" });
    await expect(specs.getByRole("row", { name: /Battery life/ })).toContainText("Up to 30 hours");

    // the WhatsApp message carries the product name, current price and canonical url
    const href = await page.getByRole("link", { name: "Ask about this product on WhatsApp" }).getAttribute("href");
    const message = new URL(href!).searchParams.get("text")!;
    expect(href).toMatch(/^https:\/\/wa\.me\/970590000000\?text=/);
    expect(message).toContain("Sony WH-1000XM5");
    expect(message).toContain("1,150");
    expect(message).toContain("/en/products/sony-wh-1000xm5");

    await expect(page.getByRole("heading", { name: "Similar products" })).toBeVisible();
    await expect(page.locator("main section[aria-labelledby=related-title] article").first()).toBeVisible();
  });

  test("has SEO metadata, language alternates and valid structured data", async ({ page }) => {
    await page.goto("/en/products/sony-wh-1000xm5");

    await expect(page).toHaveTitle("Sony WH-1000XM5 | EWS Electronics");
    const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
    expect(canonical).toMatch(/\/en\/products\/sony-wh-1000xm5$/);
    expect(await page.locator('link[rel="alternate"][hreflang="ar"]').getAttribute("href")).toMatch(/\/ar\/products\/sony-wh-1000xm5$/);
    expect(await page.locator('meta[property="og:title"]').getAttribute("content")).toBe("Sony WH-1000XM5");

    const json = await page.locator('script[type="application/ld+json"]').innerText();
    const data = JSON.parse(json);
    expect(data["@type"]).toBe("Product");
    expect(data.offers.price).toBe("1150.00");
    expect(data.offers.priceCurrency).toBe("ILS");
    expect(data.offers.availability).toBe("https://schema.org/LimitedAvailability");
  });

  test("the Arabic product page is right-to-left with Arabic content", async ({ page }) => {
    await page.goto("/ar/products/iphone-15");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.getByRole("heading", { level: 1, name: "آيفون 15" })).toBeVisible();
    await expect(page.getByRole("region", { name: "المواصفات" })).toBeVisible();
    const href = await page.getByRole("link", { name: "اسأل عن المنتج عبر واتساب" }).getAttribute("href");
    expect(new URL(href!).searchParams.get("text")).toContain("آيفون 15");
  });

  test("unknown products and pages show a friendly 404", async ({ page }) => {
    const response = await page.goto("/en/products/does-not-exist");
    expect(response?.status()).toBe(404);
    await expect(page.getByText("Page not found")).toBeVisible();
    await expect(page.getByRole("link", { name: "Back to home" })).toBeVisible();

    expect((await page.goto("/fr"))?.status()).toBe(404);
  });
});

test.describe("AI assistant placeholder", () => {
  test("opens a Coming Soon notice and makes no AI request", async ({ page }) => {
    const requests: string[] = [];
    page.on("request", (request) => requests.push(request.url()));

    await page.goto("/en");
    await page.getByRole("button", { name: "AI Shopping Assistant" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText("AI Shopping Assistant — Coming Soon");
    await expect(dialog).toContainText("not available yet");
    await dialog.getByRole("button", { name: "Got it" }).click();
    await expect(dialog).toBeHidden();

    expect(requests.filter((url) => /\/api\/ai|openai|anthropic/i.test(url))).toEqual([]);
  });

  test("shows the Arabic notice on the Arabic site", async ({ page }) => {
    await page.goto("/ar");
    await page.getByRole("button", { name: "مساعد التسوق الذكي" }).click();
    await expect(page.getByRole("dialog")).toContainText("مساعد التسوق بالذكاء الاصطناعي — قريبًا");
  });
});

test.describe("search engines", () => {
  test("robots.txt hides the admin and the sitemap lists public pages in both languages", async ({ request }) => {
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toContain("Disallow: /admin");
    expect(robots).toContain("Sitemap:");

    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap).toContain("/ar/products/iphone-15");
    expect(sitemap).toContain("/en/categories/mobiles");
    expect(sitemap).not.toContain("/admin");
  });
});

test.describe("mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("filters open in a sheet and nothing overflows horizontally", async ({ page }) => {
    for (const path of ["/en", "/en/products", "/en/products/sony-wh-1000xm5"]) {
      await page.goto(path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `${path} should not scroll sideways`).toBeLessThanOrEqual(0);
    }

    await page.goto("/en/products");
    await expect(page.getByRole("complementary", { name: "Product filters" })).toBeHidden();
    await page.getByRole("button", { name: "Filters" }).click();
    const sheet = page.getByRole("dialog", { name: "Filters" });
    await expect(sheet).toBeVisible();
    await sheet.getByLabel("Samsung").check();
    await sheet.getByRole("button", { name: "Apply" }).click();
    await expect(page).toHaveURL(/brand=samsung/);
    await expect(cards(page)).toHaveCount(2);
  });
});
