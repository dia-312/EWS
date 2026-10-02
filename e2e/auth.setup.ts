import { test as setup, expect } from "@playwright/test";
import { TEST_ADMIN, TEST_SESSION_OWNER, TEST_STRANGER, TEST_VIEWER } from "./credentials";

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

/** Safety net: test accounts must never be created on a real project. */
function assertLocalStack() {
  const host = SUPABASE_URL ? new URL(SUPABASE_URL).hostname : "";
  if (!["127.0.0.1", "localhost"].includes(host)) {
    throw new Error(
      `Refusing to create test accounts: SUPABASE_URL must point to a local Supabase stack (got "${host || "unset"}").`,
    );
  }
  if (!SERVICE_KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set.");
}

const headers = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
};

async function createUser(email: string, password: string) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers,
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  if (!response.ok) throw new Error(`create user ${email}: ${response.status} ${await response.text()}`);
  return ((await response.json()) as { id: string }).id;
}

async function rest(path: string, init?: RequestInit) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...init, headers: { ...headers, ...init?.headers } });
  if (!response.ok) throw new Error(`rest ${path}: ${response.status} ${await response.text()}`);
  return response;
}

setup("create local test accounts and sign in", async ({ page, context, baseURL }) => {
  assertLocalStack();

  const stores = (await (await rest("stores?slug=eq.ews&select=id")).json()) as { id: string }[];
  expect(stores, "the seed should have created the ews store").toHaveLength(1);
  const storeId = stores[0].id;

  // Contact details for the storefront specs (the seed leaves them empty on purpose).
  await rest(`store_settings?store_id=eq.${storeId}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      phone: "+970 59 000 0000",
      whatsapp: "970590000000",
      instagram_url: "https://instagram.com/e2e-store",
      address_en: "1 Test Street",
      address_ar: "شارع الاختبار 1",
    }),
  });

  const adminId = await createUser(TEST_ADMIN.email, TEST_ADMIN.password);
  const viewerId = await createUser(TEST_VIEWER.email, TEST_VIEWER.password);
  const sessionOwnerId = await createUser(TEST_SESSION_OWNER.email, TEST_SESSION_OWNER.password);
  await createUser(TEST_STRANGER.email, TEST_STRANGER.password);

  await rest("admin_profiles", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify([
      { id: adminId, store_id: storeId, role: "owner", display_name: TEST_ADMIN.displayName },
      { id: viewerId, store_id: storeId, role: "viewer", display_name: "E2E Viewer" },
      { id: sessionOwnerId, store_id: storeId, role: "owner", display_name: TEST_SESSION_OWNER.displayName },
    ]),
  });

  // Sign in through the real login form and keep the session for the admin specs.
  await context.addCookies([{ name: "NEXT_LOCALE", value: "en", url: baseURL! }]);
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(TEST_ADMIN.email);
  await page.getByLabel("Password").fill(TEST_ADMIN.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { name: /Welcome/ })).toBeVisible();

  await context.storageState({ path: "e2e/.auth/admin.json" });
});
