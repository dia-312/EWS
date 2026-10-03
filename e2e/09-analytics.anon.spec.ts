import { expect, test } from "./fixtures";

type Page = import("@playwright/test").Page;
type Sent = { type: string; productId?: string; query?: string; sessionId?: string };

/** Collects what the page reports to /api/track. */
function collect(page: Page) {
  const sent: Sent[] = [];
  page.on("request", (request) => {
    if (request.url().endsWith("/api/track") && request.method() === "POST") {
      sent.push(request.postDataJSON() as Sent);
    }
  });
  return sent;
}

test.describe("what the storefront reports", () => {
  test("a product page reports a page view and a product view, and nothing identifying", async ({ page }) => {
    const sent = collect(page);
    await page.goto("/en/products/iphone-15");
    await expect.poll(() => sent.map((event) => event.type).sort()).toEqual(["page_view", "product_view"]);

    const view = sent.find((event) => event.type === "product_view")!;
    expect(view.productId).toMatch(/^[0-9a-f-]{36}$/);
    expect(view.sessionId).toMatch(/^[A-Za-z0-9_-]{8,64}$/);
    expect(Object.keys(view).sort()).toEqual(["productId", "sessionId", "type"]);
    // one random id per tab, shared by every event of the visit
    expect(new Set(sent.map((event) => event.sessionId)).size).toBe(1);
  });

  test("a QR link is counted as a scan", async ({ page }) => {
    const sent = collect(page);
    await page.goto("/en/products/iphone-15?src=qr");
    await expect.poll(() => sent.some((event) => event.type === "qr_scan")).toBe(true);
    await page.goto("/en/products/iphone-15");
    await page.waitForLoadState("networkidle");
    expect(sent.filter((event) => event.type === "qr_scan")).toHaveLength(1);
  });

  test("searches, favorites, comparisons and shares are reported", async ({ page }) => {
    const sent = collect(page);
    await page.goto("/en/products?q=iphone");
    await expect.poll(() => sent.some((event) => event.type === "search" && event.query === "iphone")).toBe(true);

    await page.goto("/en/products/iphone-15");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await page.getByRole("button", { name: "Compare", exact: true }).click();
    await page.getByRole("button", { name: "Share" }).click();
    await expect
      .poll(() => sent.map((event) => event.type).filter((type) => ["favorite_add", "compare_add", "share"].includes(type)).sort())
      .toEqual(["compare_add", "favorite_add", "share"]);

    // taking something out again is not an "add"
    await page.getByRole("button", { name: "Saved" }).click();
    await page.waitForTimeout(300);
    expect(sent.filter((event) => event.type === "favorite_add")).toHaveLength(1);
  });

  test("clicks on contact buttons are reported with their product", async ({ page }) => {
    const sent = collect(page);
    await page.goto("/en/products/iphone-15");
    await expect.poll(() => sent.some((event) => event.type === "product_view")).toBe(true);
    const productId = sent.find((event) => event.type === "product_view")!.productId!;

    // The seed has no phone numbers, so add a button shaped like the real ones.
    await page.evaluate((id) => {
      const link = document.createElement("a");
      link.href = "#contact";
      link.id = "fake-contact";
      link.setAttribute("data-contact", "phone");
      link.setAttribute("data-product", id);
      link.textContent = "call";
      document.querySelector("main")!.append(link);
    }, productId);
    await page.locator("#fake-contact").click();
    await expect.poll(() => sent.some((event) => event.type === "phone_click" && event.productId === productId)).toBe(true);
  });

  test("a visitor who sends Do Not Track is not counted", async ({ page }) => {
    await page.addInitScript(() => Object.defineProperty(navigator, "doNotTrack", { value: "1", configurable: true }));
    const sent = collect(page);
    await page.goto("/en/products/iphone-15");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);
    expect(sent).toEqual([]);
  });
});

test.describe("the tracking endpoint", () => {
  test("accepts a well-formed event and rejects anything else", async ({ request }) => {
    const ok = await request.post("/api/track", { data: { type: "page_view" } });
    expect(ok.status()).toBe(204);

    for (const data of [{ type: "drop_all_tables" }, { type: "product_view" }, { type: "search" }, "nope"]) {
      const bad = await request.post("/api/track", { data });
      expect(bad.status()).toBe(400);
    }
  });
});
