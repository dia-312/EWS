import { expect, test, unique } from "./fixtures";

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const ANON_KEY = process.env.SUPABASE_ANON_KEY ?? "";
const restHeaders = { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}`, "Content-Type": "application/json", Prefer: "return=minimal" };

async function productId(slug: string) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/products?select=id&slug=eq.${slug}`, { headers: restHeaders });
  return ((await response.json()) as { id: string }[])[0].id;
}

test.describe("leaving a review", () => {
  test("a visitor rates a product; the review waits for the store's approval", async ({ page }) => {
    await page.goto("/en/products/jbl-tune-520bt");
    const reviews = page.locator("[data-reviews]");
    await expect(reviews.getByText("No reviews yet")).toBeVisible();

    await reviews.getByRole("button", { name: "Write a review" }).click();
    const form = page.locator("[data-review-form]");

    // a rating is required
    await form.getByRole("button", { name: "Send review" }).click();
    await expect(form.getByRole("alert")).toContainText("Choose a rating");

    await form.getByLabel("4 out of 5 stars").check({ force: true });
    await expect(form.getByRole("alert")).toHaveCount(0);
    await form.getByLabel("Your name (optional)").fill("Sara");
    await form.getByLabel("Your comment (optional)").fill(`Good sound for the price ${unique("note")}`);
    await form.getByRole("button", { name: "Send review" }).click();
    await expect(page.locator("[data-review-saved]")).toContainText("will appear once the store approves it");

    // nothing is shown until it is approved: no stars on the page, none on the cards
    await page.reload();
    await expect(page.locator("[data-reviews]").getByText("No reviews yet")).toBeVisible();
    await expect(page.locator("[data-review]")).toHaveCount(0);
    await expect(page.locator("[data-rating-link]")).toHaveCount(0);
  });

  test("links in a review are refused with a message", async ({ page }) => {
    await page.goto("/en/products/jbl-tune-520bt");
    await page.getByRole("button", { name: "Write a review" }).click();
    const form = page.locator("[data-review-form]");
    await form.getByLabel("5 out of 5 stars").check({ force: true });
    await form.getByLabel("Your comment (optional)").fill("Cheap pills at https://spam.example");
    await form.getByRole("button", { name: "Send review" }).click();
    await expect(form.getByRole("alert")).toContainText("remove links");

    await form.getByLabel("Your comment (optional)").fill("No links any more");
    await expect(form.getByRole("alert")).toHaveCount(0);
  });

  test("the Arabic product page speaks Arabic", async ({ page }) => {
    await page.goto("/ar/products/jbl-tune-520bt");
    await expect(page.getByRole("heading", { name: "تقييمات الزبائن" })).toBeVisible();
    await expect(page.getByRole("button", { name: "اكتب تقييمًا" })).toBeVisible();
  });
});

test.describe("the reviews endpoint", () => {
  test("accepts a good review and refuses the rest", async ({ request }) => {
    const id = await productId("jbl-tune-520bt");
    const good = { productId: id, rating: 5, name: "Omar", comment: "Excellent", locale: "en" };

    expect((await request.post("/api/reviews", { data: good })).status()).toBe(201);

    const bad = async (data: object, status: number) =>
      expect((await request.post("/api/reviews", { data: { ...good, ...data } })).status(), JSON.stringify(data)).toBe(status);

    await bad({ rating: 0 }, 400);
    await bad({ rating: 6 }, 400);
    await bad({ rating: 4.5 }, 400);
    await bad({ rating: "5" }, 400);
    await bad({ productId: "nope" }, 400);
    await bad({ locale: "fr" }, 400);
    await bad({ comment: "see www.spam.example" }, 422);
    await bad({ name: "x".repeat(61) }, 422);
    await bad({ comment: "x".repeat(1001) }, 422);
    await bad({ productId: "00000000-0000-4000-8000-000000000000" }, 404);
    await bad({ website: "http://spam.example" }, 201); // a bot is told it worked
  });

  test("the database refuses anything that skips the approval", async ({ request }) => {
    const id = await productId("jbl-tune-520bt");
    const store = (await (await fetch(`${SUPABASE_URL}/rest/v1/products?select=store_id&id=eq.${id}`, { headers: restHeaders })).json())[0].store_id;

    // a visitor cannot publish a review straight away
    const approved = await request.post(`${SUPABASE_URL}/rest/v1/product_reviews`, {
      headers: restHeaders,
      data: { store_id: store, product_id: id, rating: 5, status: "approved" },
    });
    expect(approved.ok()).toBe(false);

    // nor give a star rating outside 1 to 5
    const tooMany = await request.post(`${SUPABASE_URL}/rest/v1/product_reviews`, {
      headers: restHeaders,
      data: { store_id: store, product_id: id, rating: 9 },
    });
    expect(tooMany.ok()).toBe(false);

    // pending reviews cannot be read back, and nobody can change or delete one
    const read = await request.get(`${SUPABASE_URL}/rest/v1/product_reviews?select=id,comment`, { headers: restHeaders });
    expect(read.ok() ? await read.json() : []).toEqual([]);
    const update = await request.patch(`${SUPABASE_URL}/rest/v1/product_reviews?product_id=eq.${id}`, { headers: restHeaders, data: { status: "approved" } });
    expect(update.ok() ? update.status() : 401).not.toBe(200);
    const remove = await request.delete(`${SUPABASE_URL}/rest/v1/product_reviews?product_id=eq.${id}`, { headers: restHeaders });
    expect(remove.ok() ? remove.status() : 401).not.toBe(200);
  });
});
