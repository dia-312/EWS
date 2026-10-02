import { expect, test } from "./fixtures";

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const ANON_KEY = process.env.SUPABASE_ANON_KEY ?? "";

const headers = { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` };
const rest = (path: string) => `${SUPABASE_URL}/rest/v1/${path}`;

test.describe("what an anonymous visitor can do against the database", () => {
  test.skip(!SUPABASE_URL || !ANON_KEY, "needs the local Supabase environment");

  test("reads only public catalogue data", async ({ request }) => {
    const products = await request.get(rest("products?select=slug"), { headers });
    expect(products.ok()).toBe(true);
    expect(await products.json()).toHaveLength(12);

    const offers = await request.get(rest("offers?select=new_price"), { headers });
    expect(await offers.json()).toHaveLength(1); // only the live offer

    const settings = await request.get(rest("store_settings?select=store_id"), { headers });
    expect(await settings.json()).toHaveLength(1);
  });

  test("cannot see admin or analytics data", async ({ request }) => {
    for (const table of ["admin_profiles", "analytics_events", "notification_subscriptions"]) {
      const response = await request.get(rest(`${table}?select=*`), { headers });
      const body = response.ok() ? await response.json() : [];
      expect(body, `${table} must expose no rows`).toHaveLength(0);
    }
  });

  test("cannot write to the catalogue, settings or storage", async ({ request }) => {
    const [category] = (await (await request.get(rest("categories?select=id,store_id&limit=1"), { headers })).json()) as {
      id: string;
      store_id: string;
    }[];

    const insert = await request.post(rest("categories"), {
      headers: { ...headers, "Content-Type": "application/json" },
      data: { store_id: category.store_id, name_ar: "hack", slug: "hack" },
    });
    expect(insert.ok()).toBe(false);

    const update = await request.patch(rest(`categories?id=eq.${category.id}`), {
      headers: { ...headers, "Content-Type": "application/json", Prefer: "return=representation" },
      data: { name_ar: "hacked" },
    });
    const updated = update.ok() ? await update.json() : [];
    expect(updated).toHaveLength(0);

    const upload = await request.post(
      `${SUPABASE_URL}/storage/v1/object/product-images/${category.store_id}/x/hack.webp`,
      { headers: { ...headers, "Content-Type": "image/webp" }, data: Buffer.from("not an image") },
    );
    expect(upload.ok()).toBe(false);
  });

  test("can record anonymous analytics events but only of allowed types", async ({ request }) => {
    const [store] = (await (await request.get(rest("stores?select=id&limit=1"), { headers })).json()) as { id: string }[];

    const allowed = await request.post(rest("analytics_events"), {
      headers: { ...headers, "Content-Type": "application/json", Prefer: "return=minimal" },
      data: { store_id: store.id, event_type: "page_view" },
    });
    expect(allowed.ok()).toBe(true);

    const invalid = await request.post(rest("analytics_events"), {
      headers: { ...headers, "Content-Type": "application/json", Prefer: "return=minimal" },
      data: { store_id: store.id, event_type: "drop_all_tables" },
    });
    expect(invalid.ok()).toBe(false);
  });
});
