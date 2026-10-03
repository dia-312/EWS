import { expect, test, unique } from "./fixtures";

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const ANON_KEY = process.env.SUPABASE_ANON_KEY ?? "";

async function productId(slug: string) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/products?select=id&slug=eq.${slug}`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
  });
  return ((await response.json()) as { id: string }[])[0].id;
}

const email = () => `${unique("visitor").replace(/-/g, "")}@example.com`;

test.describe("asking to be told", () => {
  test("an out-of-stock product offers 'tell me when it is back'; a visitor can leave an email", async ({ page }) => {
    await page.goto("/en/products/lg-8kg-front-load-washer");
    await expect(page.locator("[data-notify-open='price_drop']")).toHaveCount(0);
    await page.getByRole("button", { name: "Notify me when it is back" }).click();

    const form = page.locator("[data-notify-form='restock']");
    const submit = form.getByRole("button", { name: "Notify me" });
    // consent comes first
    await form.getByLabel("Email or phone number").fill(email());
    await expect(submit).toBeDisabled();
    await form.getByRole("checkbox").check();
    await expect(submit).toBeEnabled();

    await submit.click();
    await expect(page.locator("[data-notify-saved]")).toContainText("The store will contact you when this product is back");
  });

  test("a wrong email or number is refused with a message, and typing clears it", async ({ page }) => {
    await page.goto("/en/products/lg-8kg-front-load-washer");
    await page.getByRole("button", { name: "Notify me when it is back" }).click();
    const form = page.locator("[data-notify-form='restock']");

    await form.getByLabel("Email or phone number").fill("not a contact");
    await form.getByRole("checkbox").check();
    await form.getByRole("button", { name: "Notify me" }).click();
    await expect(form.getByRole("alert")).toContainText("Enter a valid email address or phone number");

    await form.getByLabel("Email or phone number").fill("not a contact!");
    await expect(form.getByRole("alert")).toHaveCount(0);
  });

  test("asking twice with the same contact is fine", async ({ page }) => {
    const contact = email();
    for (let attempt = 0; attempt < 2; attempt++) {
      await page.goto("/en/products/lg-8kg-front-load-washer");
      await page.getByRole("button", { name: "Notify me when it is back" }).click();
      const form = page.locator("[data-notify-form='restock']");
      await form.getByLabel("Email or phone number").fill(contact);
      await form.getByRole("checkbox").check();
      await form.getByRole("button", { name: "Notify me" }).click();
      await expect(page.locator("[data-notify-saved]")).toBeVisible();
    }
  });

  test("a product that is in stock offers 'tell me if the price drops' instead", async ({ page }) => {
    await page.goto("/en/products/lg-43-smart-tv");
    await expect(page.locator("[data-notify-open='restock']")).toHaveCount(0);
    await page.getByRole("button", { name: "Tell me if the price drops" }).click();

    const form = page.locator("[data-notify-form='price_drop']");
    await form.getByLabel("Email or phone number").fill("+970 59 123 4567");
    await form.getByRole("checkbox").check();
    await form.getByRole("button", { name: "Notify me" }).click();
    await expect(page.locator("[data-notify-saved]")).toContainText("if the price drops");
  });

  test("the Arabic site speaks Arabic", async ({ page }) => {
    await page.goto("/ar/products/lg-8kg-front-load-washer");
    await expect(page.getByRole("button", { name: "أخبروني عند عودته" })).toBeVisible();
  });
});

test.describe("the subscription endpoint", () => {
  test("rejects what it should and accepts what it should", async ({ request }) => {
    const washer = await productId("lg-8kg-front-load-washer");
    const tv = await productId("lg-43-smart-tv");
    const good = { productId: washer, type: "restock", contact: email(), locale: "en", consent: true };

    expect((await request.post("/api/notifications/subscribe", { data: good })).status()).toBe(201);

    const bad = async (data: object, status: number) =>
      expect((await request.post("/api/notifications/subscribe", { data: { ...good, ...data } })).status(), JSON.stringify(data)).toBe(status);

    await bad({ consent: false }, 400); // consent is required
    await bad({ type: "spam" }, 400);
    await bad({ productId: "nope" }, 400);
    await bad({ locale: "fr" }, 400);
    await bad({ contact: "nope" }, 422);
    await bad({ productId: tv }, 409); // "back in stock" makes no sense for a product that is in stock
    await bad({ productId: "00000000-0000-4000-8000-000000000000" }, 404);

    // a bot that fills the hidden field is told it worked, so it learns nothing
    await bad({ website: "http://spam.example", contact: email() }, 201);
  });

  test("nobody can read the requests back", async ({ request }) => {
    const response = await request.get(`${SUPABASE_URL}/rest/v1/notification_subscriptions?select=destination`, {
      headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
    });
    const body = response.ok() ? await response.json() : [];
    expect(body).toEqual([]);
  });
});
