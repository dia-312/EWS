import { expect, test } from "./fixtures";

test.describe("installable app", () => {
  test("the manifest carries the store's name, colors and icons", async ({ request }) => {
    const response = await request.get("/manifest.webmanifest");
    expect(response.status()).toBe(200);
    const manifest = await response.json();

    expect(manifest.name.length).toBeGreaterThan(0);
    expect(manifest.short_name.length).toBeLessThanOrEqual(12);
    expect(manifest.display).toBe("standalone");
    expect(manifest.start_url).toBe("/ar");
    expect(manifest.dir).toBe("rtl");
    expect(manifest.theme_color).toMatch(/^#[0-9a-f]{6}$/i);
    expect(manifest.background_color).toMatch(/^#[0-9a-f]{6}$/i);

    const purposes = manifest.icons.map((icon: { sizes: string; purpose: string }) => `${icon.sizes}:${icon.purpose}`);
    expect(purposes).toEqual(expect.arrayContaining(["192x192:any", "512x512:any", "512x512:maskable"]));
  });

  test("every icon the manifest names is a PNG of the promised size, in the store's color", async ({ request }) => {
    const manifest = await (await request.get("/manifest.webmanifest")).json();
    for (const icon of manifest.icons as { src: string; sizes: string }[]) {
      const response = await request.get(icon.src);
      expect(response.status(), icon.src).toBe(200);
      expect(response.headers()["content-type"]).toBe("image/png");
      const png = await response.body();
      expect(png.subarray(1, 4).toString("ascii")).toBe("PNG");
      const size = Number(icon.sizes.split("x")[0]);
      expect(png.readUInt32BE(16)).toBe(size);
      expect(png.readUInt32BE(20)).toBe(size);
    }
    expect((await request.get("/pwa-icon/apple-180")).status()).toBe(200);
    expect((await request.get("/pwa-icon/999")).status()).toBe(404);
    expect((await request.get("/pwa-icon/toString")).status()).toBe(404);
  });

  test("pages point at the manifest, the phone icon and the browser-bar color", async ({ page }) => {
    await page.goto("/en");
    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "/manifest.webmanifest");
    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute("href", /\/pwa-icon\/apple-180/);
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", /^#[0-9a-f]{6}$/i);
  });

  test("the install button appears only when the browser offers installation", async ({ page }) => {
    await page.goto("/en");
    await expect(page.locator("[data-install-app]")).toHaveCount(0);

    await page.evaluate(() => {
      const event = new Event("beforeinstallprompt", { cancelable: true });
      (event as unknown as { prompt: () => Promise<void> }).prompt = async () => {
        (window as unknown as { prompted: boolean }).prompted = true;
      };
      (event as unknown as { userChoice: Promise<{ outcome: string }> }).userChoice = Promise.resolve({ outcome: "accepted" });
      window.dispatchEvent(event);
    });
    const button = page.getByRole("button", { name: "Install the app" });
    await expect(button).toBeVisible();
    await button.click();
    await expect.poll(() => page.evaluate(() => (window as unknown as { prompted?: boolean }).prompted)).toBe(true);
    await expect(page.locator("[data-install-app]")).toHaveCount(0);
  });
});

test.describe("offline", () => {
  test("the offline page and the service worker are served", async ({ request }) => {
    const offline = await request.get("/offline.html");
    expect(offline.status()).toBe(200);
    expect(await offline.text()).toContain("لا يوجد اتصال");

    const worker = await request.get("/sw.js");
    expect(worker.status()).toBe(200);
    expect(worker.headers()["content-type"]).toContain("javascript");
  });

  test("without a connection a page open shows the offline page, never old store data", async ({ page, context }) => {
    await page.goto("/en/products/iphone-15");
    await page.evaluate(() => navigator.serviceWorker.ready);
    // the worker only controls pages opened after it took over
    await page.reload();
    await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);

    await context.setOffline(true);
    await page.goto("/en/products/iphone-15").catch(() => {});
    await expect(page.getByRole("heading", { name: "You are offline" })).toBeVisible();
    await expect(page.getByText("iPhone 15")).toHaveCount(0);

    await context.setOffline(false);
    await page.goto("/en/products/iphone-15");
    await expect(page.getByRole("heading", { name: "iPhone 15" })).toBeVisible();
  });
});
