import { expect, test } from "./fixtures";

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const ANON_KEY = process.env.SUPABASE_ANON_KEY ?? "";

test("the 'Most viewed' sort puts the products visitors looked at most first", async ({ page, request }) => {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/products?select=id&slug=eq.jbl-tune-520bt`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
  });
  const [{ id }] = (await response.json()) as { id: string }[];

  // far more views than any other product has received in the other tests
  await Promise.all(
    Array.from({ length: 60 }, () => request.post("/api/track", { data: { type: "product_view", productId: id } })),
  );

  await page.goto("/en/products");
  await page.getByRole("link", { name: "Most viewed" }).click();
  await expect(page).toHaveURL(/sort=popular/);
  await expect(page.getByRole("link", { name: "Most viewed" })).toHaveAttribute("aria-current", "true");
  await expect(page.locator("main article").first()).toContainText("JBL Tune 520BT");

  // the other sorts are untouched
  await page.goto("/en/products?sort=price_asc");
  await expect(page.locator("main article").first()).not.toContainText("JBL Tune 520BT");
});
