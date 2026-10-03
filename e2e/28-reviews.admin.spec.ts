import { expect, test, unique } from "./fixtures";

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const ANON_KEY = process.env.SUPABASE_ANON_KEY ?? "";

test("the owner approves a review, and it shows up with its stars; rejecting hides it again", async ({ page, request }) => {
  const comment = `Very good ${unique("rv")}`;
  const ids = await page.request
    .get(`${SUPABASE_URL}/rest/v1/products?select=id&slug=eq.sony-wh-1000xm5`, { headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` } })
    .then((response) => response.json() as Promise<{ id: string }[]>);
  const created = await request.post("/api/reviews", { data: { productId: ids[0].id, rating: 4, name: "Layla", comment, locale: "en" } });
  expect(created.status()).toBe(201);

  const review = () => page.locator("[data-review-row]", { hasText: comment });
  const stage = async (name: string) => {
    await page.goto(name === "pending" ? "/admin/reviews" : `/admin/reviews?status=${name}`);
  };

  try {
    // ---- it waits in the list, and the dashboard says so
    await page.goto("/admin");
    await expect(page.locator("[data-waiting-reviews]")).toContainText("waiting for your approval");
    await stage("pending");
    await expect(review()).toContainText("Layla");
    await expect(review()).toContainText("Sony WH-1000XM5");

    // not on the site yet
    expect(await (await request.get("/en/products/sony-wh-1000xm5")).text()).not.toContain(comment);

    // ---- approve: the product page shows it, with the average and the stars
    await review().getByRole("button", { name: "Approve" }).click();
    await expect(review()).toHaveCount(0);
    await stage("approved");
    await expect(review()).toBeVisible();

    await page.goto("/en/products/sony-wh-1000xm5");
    const shown = page.locator("[data-review]", { hasText: comment });
    await expect(shown).toBeVisible();
    await expect(shown).toContainText("Layla");
    await expect(page.locator("[data-rating-average]")).toHaveText("4");
    await expect(page.locator("[data-rating-link]")).toContainText("1 reviews");

    // search engines get the same, real numbers
    const jsonLd = await page.locator("script[type='application/ld+json']").first().textContent();
    expect(JSON.parse(jsonLd!).aggregateRating).toEqual({ "@type": "AggregateRating", ratingValue: 4, reviewCount: 1 });

    // and the product's card shows its stars in lists
    await page.goto("/en/products?q=sony");
    const card = page.locator("main article", { hasText: "Sony WH-1000XM5" });
    await expect(card.locator("[data-card-rating]")).toContainText("4 (1)");

    // ---- reject: gone from the page, the card and the structured data
    await stage("approved");
    await review().getByRole("button", { name: "Reject" }).click();
    await expect(review()).toHaveCount(0);
    await stage("rejected");
    await expect(review()).toBeVisible();

    await page.goto("/en/products/sony-wh-1000xm5");
    await expect(page.locator("[data-review]")).toHaveCount(0);
    await expect(page.locator("[data-rating-link]")).toHaveCount(0);
    const afterJsonLd = await page.locator("script[type='application/ld+json']").first().textContent();
    expect(JSON.parse(afterJsonLd!).aggregateRating).toBeUndefined();
    await page.goto("/en/products?q=sony");
    await expect(page.locator("main article", { hasText: "Sony WH-1000XM5" }).locator("[data-card-rating]")).toHaveCount(0);
  } finally {
    // delete it, whatever happened above
    for (const name of ["pending", "approved", "rejected"]) {
      await stage(name);
      if ((await review().count()) > 0) {
        await review().getByRole("button", { name: "Delete", exact: true }).click();
        await review().getByRole("dialog").getByRole("button", { name: "Yes, delete" }).click();
        await expect(review()).toHaveCount(0);
      }
    }
  }
});
