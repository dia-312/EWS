import { expect, makePng, test, unique } from "./fixtures";

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const ANON_KEY = process.env.SUPABASE_ANON_KEY ?? "";

test("the product list searches Arabic text and filters by availability", async ({ page }) => {
  await page.goto("/admin/products");
  await expect(page.getByRole("row", { name: /Samsung Galaxy A55/ })).toBeVisible();

  // "ايفون" (no hamza/diacritics) must find "iPhone 15" through its aliases.
  await page.getByLabel("Search").fill("ايفون");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page.getByRole("row", { name: /iPhone 15/ })).toBeVisible();
  await expect(page.getByRole("row", { name: /Samsung Galaxy A55/ })).toHaveCount(0);

  // "سماعه" matches headphones written with a ta marbuta ("سماعة").
  await page.getByLabel("Search").fill("سماعه");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page.getByRole("row", { name: /JBL Tune 520BT/ })).toBeVisible();
  await expect(page.getByRole("row", { name: /Sony WH-1000XM5/ })).toBeVisible();

  await page.getByRole("link", { name: "Clear filters" }).click();
  await expect(page).toHaveURL(/\/admin\/products$/);
  await page.getByLabel("Availability").selectOption({ label: "Out of stock" });
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page.getByRole("row", { name: /LG 8 kg Front Load Washer/ })).toBeVisible();
  await expect(page.getByRole("row", { name: /iPhone 15/ })).toHaveCount(0);
});

test("a product goes from creation to visibility, with images, and can be duplicated and deleted", async ({
  page,
  request,
}) => {
  const slug = unique("e2e-gadget");
  const name = "E2E Gadget";

  // ---- create (saved hidden, because it has no image yet)
  await page.goto("/admin/products/new");
  await expect(page.getByLabel("Visible to visitors")).toBeDisabled();

  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("This field is required.").first()).toBeVisible();

  await page.getByLabel("Arabic name").fill("منتج اختبار");
  await page.getByLabel("English name").fill(name);
  await expect(page.getByLabel("Slug")).toHaveValue("e2e-gadget");
  await page.getByLabel("Slug").fill(slug);
  await page.getByLabel("Category").selectOption({ label: "Mobile Phones" });
  await page.getByLabel("New brand").fill("E2E Brand");
  await page.getByLabel("Price (ILS)").fill("99.5");
  await page.getByLabel("Extra search words").fill("جهاز اختباري");

  await page.getByRole("button", { name: "Add specification" }).click();
  await page.getByLabel("Value (Arabic)").fill("٨ جيجا");
  await page.getByLabel("Value (English)").fill("8 GB");

  await page.getByRole("button", { name: "Save" }).click();
  await expect(page).toHaveURL(/\/admin\/products\?saved=created/);
  await expect(page.getByText("Product added.")).toBeVisible();

  const row = () => page.getByRole("row", { name: new RegExp(slug) });
  await expect(row()).toContainText("Hidden");
  await expect(row()).toContainText("E2E Brand");

  // ---- cannot be shown without a primary image
  await row().getByRole("link", { name: "Edit" }).click();
  await expect(page.getByRole("heading", { name: "Edit product" })).toBeVisible();
  await expect(page.getByText("No images yet.")).toBeVisible();
  await expect(page.getByLabel("Arabic name")).toHaveValue("منتج اختبار");
  await expect(page.getByLabel("Value (English)")).toHaveValue("8 GB");

  await page.getByLabel("Visible to visitors").check();
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Add a primary image to the product first, then show it.").first()).toBeVisible();
  await page.getByLabel("Visible to visitors").uncheck();

  // a hidden product does not exist for visitors
  expect((await request.get(`/en/products/${slug}`)).status()).toBe(404);
  expect(await (await request.get("/sitemap.xml")).text()).not.toContain(slug);

  // ---- images: upload (compressed in the browser), primary, order
  const images = page.locator('section[aria-labelledby="images-title"]');
  const fileInput = images.locator('input[type="file"]');

  await fileInput.setInputFiles({ name: "first.png", mimeType: "image/png", buffer: makePng(300, 200, [200, 40, 40]) });
  await expect(images.locator("li")).toHaveCount(1);
  await expect(images.getByText("Primary", { exact: true })).toBeVisible();

  await fileInput.setInputFiles({ name: "second.png", mimeType: "image/png", buffer: makePng(300, 200, [40, 40, 200]) });
  await expect(images.locator("li")).toHaveCount(2);
  await expect(images.getByText("Primary", { exact: true })).toHaveCount(1);

  const stored = await images.locator("li img").first().getAttribute("src");
  expect(stored).toContain("-thumb.");
  const thumb = await request.get(stored!);
  expect(thumb.status(), "the stored thumbnail is publicly readable").toBe(200);
  expect(thumb.headers()["content-type"]).toMatch(/image\/(webp|jpeg)/);

  // ---- pictures can be reordered by dragging (keyboard: Space, arrow, Space), and the order is saved
  const sources = () => images.locator("li img").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("src")));
  const dragged = await sources();
  const moveFirstPicture = async (key: "ArrowDown" | "ArrowUp", handleIndex: number) => {
    // Keys pressed before the page has hydrated are lost, so confirm the picture was picked up.
    await expect(async () => {
      await images.locator("[data-drag-handle]").nth(handleIndex).focus();
      await page.keyboard.press("Space");
      await expect(page.locator("[id^='DndLiveRegion']")).toContainText(/Picked up|is now at position/, { timeout: 1500 });
    }).toPass({ timeout: 15_000 });
    await page.keyboard.press(key);
    await page.waitForTimeout(250);
    await page.keyboard.press("Space");
  };
  await moveFirstPicture("ArrowDown", 0);
  await expect.poll(sources).toEqual([dragged[1], dragged[0]]);
  await page.reload();
  expect(await sources()).toEqual([dragged[1], dragged[0]]);
  await moveFirstPicture("ArrowUp", 1);
  await expect.poll(sources).toEqual(dragged);

  await images.getByRole("button", { name: "Make primary" }).click();
  await expect(images.getByText("Primary", { exact: true })).toHaveCount(1);

  // ---- now it can be shown
  await page.getByLabel("Visible to visitors").check();
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page).toHaveURL(/\/admin\/products\?saved=updated/);
  await expect(row()).toContainText("Visible");
  await expect(row().locator("img")).toBeVisible();

  // ---- visitors see it on the storefront, in both languages, with its image and search aliases
  const publicPage = await request.get(`/en/products/${slug}`);
  expect(publicPage.status()).toBe(200);
  expect(await publicPage.text()).toContain("E2E Gadget");
  expect((await request.get(`/ar/products/${slug}`)).status()).toBe(200);
  expect(await (await request.get("/sitemap.xml")).text()).toContain(slug);
  await page.goto("/en/products?q=%D8%AC%D9%87%D8%A7%D8%B2+%D8%A7%D8%AE%D8%AA%D8%A8%D8%A7%D8%B1%D9%8A"); // an alias typed in Arabic
  await expect(page.locator("main article", { hasText: "E2E Gadget" })).toBeVisible();
  await expect(page.locator("main article", { hasText: "E2E Gadget" }).locator("img")).toHaveAttribute("src", /-thumb\./);
  await page.goto("/admin/products");

  // ---- visitors can read it, with its images and specs
  if (SUPABASE_URL && ANON_KEY) {
    const publicRow = await request.get(
      `${SUPABASE_URL}/rest/v1/products?slug=eq.${slug}&select=slug,product_images(is_primary),product_specs(spec_key)`,
      { headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` } },
    );
    const [product] = (await publicRow.json()) as { product_images: { is_primary: boolean }[]; product_specs: unknown[] }[];
    expect(product.product_images).toHaveLength(2);
    expect(product.product_images.filter((image) => image.is_primary)).toHaveLength(1);
    expect(product.product_specs).toHaveLength(1);
  }

  // ---- duplicate creates a hidden copy
  await row().getByRole("button", { name: "Duplicate" }).click();
  await expect(page).toHaveURL(/\/admin\/products\/[0-9a-f-]{36}$/);
  await expect(page.getByLabel("Slug")).toHaveValue(`${slug}-copy`);
  await expect(page.getByLabel("Visible to visitors")).not.toBeChecked();
  await page.goto("/admin/products");
  await expect(page.getByRole("row", { name: new RegExp(`${slug}-copy`) })).toContainText("Hidden");

  // ---- delete both through the confirmation dialog
  // (the copy first: its slug contains the original's)
  for (const target of [`${slug}-copy`, slug]) {
    const targetRow = page.getByRole("row", { name: new RegExp(target) });
    await targetRow.getByRole("button", { name: "Delete", exact: true }).click();
    await targetRow.getByRole("dialog").getByRole("button", { name: "Yes, delete" }).click();
    await expect(targetRow).toHaveCount(0);
  }

  // Gone for visitors too.
  expect((await request.get(`/en/products/${slug}`)).status()).toBe(404);

  // Deleting a product also deletes its stored files.
  expect((await request.get(stored!)).status(), "stored thumbnail removed with the product").toBeGreaterThanOrEqual(400);
});
