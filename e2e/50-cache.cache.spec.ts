import { expect, test } from "./fixtures";

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

const headers = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=minimal",
};

async function renameStore(name: string) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/stores?slug=eq.ews`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ name }),
  });
  if (!response.ok) throw new Error(`rename failed: ${response.status} ${await response.text()}`);
}

test.describe("storefront cache (production-like configuration)", () => {
  test.skip(!process.env.CACHE_BASE_URL || !SUPABASE_URL || !SERVICE_KEY, "needs the cached app and the local stack");

  test("repeat visits are served from memory, so a database change is not seen at once", async ({ request }) => {
    const first = await (await request.get("/en")).text();
    expect(first).toContain("EWS Electronics");

    try {
      await renameStore("EWS Renamed Behind The Cache");

      // Within the cache window the visitor still gets the cached page: no database round trip.
      const cached = await (await request.get("/en")).text();
      expect(cached).toContain("EWS Electronics");
      expect(cached).not.toContain("Renamed Behind The Cache");
    } finally {
      await renameStore("EWS Electronics");
    }
  });

  test("cached pages never include admin-only data", async ({ request }) => {
    const html = await (await request.get("/en/products")).text();
    expect(html).not.toContain("admin_profiles");
    expect(html).not.toContain("service_role");
  });

  test("the admin area is not cached", async ({ request }) => {
    // Anonymous visitors are always sent to the login flow, never served a cached admin page.
    const response = await request.get("/admin/products", { maxRedirects: 0 });
    expect([307, 308]).toContain(response.status());
  });
});
