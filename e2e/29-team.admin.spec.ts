import { TEST_ADMIN, TEST_STRANGER, TEST_VIEWER } from "./credentials";
import { expect, test } from "./fixtures";

type Page = import("@playwright/test").Page;
type Browser = import("@playwright/test").Browser;

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

/** A browser of its own (the English admin), so signing in as someone else does not touch the owner's session. */
async function asSomeoneElse(browser: Browser, baseURL: string | undefined) {
  const context = await browser.newContext({ baseURL, storageState: { cookies: [], origins: [] } });
  await context.addCookies([{ name: "NEXT_LOCALE", value: "en", url: baseURL! }]);
  return { context, page: await context.newPage() };
}

const member = (page: Page, email: string) => page.locator("[data-team-member]", { hasText: email });

test("the owner sees the team, and people without the owner role cannot", async ({ page, browser, baseURL }) => {
  await page.goto("/admin");
  await page.getByRole("link", { name: "Team", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Team", exact: true })).toBeVisible();

  await expect(member(page, TEST_VIEWER.email)).toContainText("Viewer");
  // the owner's own row has no controls: nobody can lock themselves out
  const own = page.locator("[data-team-member]", { hasText: "E2E Admin" });
  await expect(own).toContainText("Owner");
  await expect(own).toContainText("You");
  await expect(own.getByRole("button")).toHaveCount(0);

  // a viewer has no Team link, and the page sends them away
  const { context, page: viewer } = await asSomeoneElse(browser, baseURL);
  await signIn(viewer, TEST_VIEWER.email, TEST_VIEWER.password);
  await expect(viewer).toHaveURL(/\/admin$/);
  await expect(viewer.getByRole("link", { name: "Team", exact: true })).toHaveCount(0);
  await viewer.goto("/admin/team");
  await expect(viewer).toHaveURL(/\/admin\?error=owner_only/);
  await expect(viewer.getByText("Only the owner can manage the team.")).toBeVisible();
  await context.close();
});

test("the owner adds someone, changes what they may do, and removes them", async ({ page, browser, baseURL }) => {
  await page.goto("/admin/team");
  const form = page.locator("[data-team-add]");

  // an email that has no sign-in yet is explained, not accepted
  await form.getByLabel("Their email").fill("nobody-has-this@example.test");
  await form.getByRole("button", { name: "Add to the team" }).click();
  await expect(form.getByRole("alert")).toContainText("No sign-in exists for this email yet");

  // an existing sign-in is added as a viewer
  await form.getByLabel("Their email").fill(TEST_STRANGER.email);
  await form.getByLabel("Name (optional)").fill("E2E Guest");
  await form.getByLabel("Role").selectOption({ label: "Viewer" });
  await form.getByRole("button", { name: "Add to the team" }).click();
  await expect(form.getByRole("status")).toHaveText("Done.");
  await expect(member(page, TEST_STRANGER.email)).toContainText("Viewer");

  const { context, page: guest } = await asSomeoneElse(browser, baseURL);
  try {
    // they can now sign in, but only to look
    await signIn(guest, TEST_STRANGER.email, TEST_STRANGER.password);
    await expect(guest).toHaveURL(/\/admin$/);
    await guest.getByRole("link", { name: "Categories" }).click();
    await expect(guest.getByRole("heading", { name: "Categories" })).toBeVisible();
    await expect(guest.getByRole("link", { name: "Add category" })).toHaveCount(0);

    // made an editor, they can add things
    await page.getByLabel("Change the role of E2E Guest").selectOption({ label: "Editor" });
    await expect(member(page, TEST_STRANGER.email)).toContainText("Editor");
    await guest.reload();
    await expect(guest.getByRole("link", { name: "Add category" })).toBeVisible();
    // but an editor still cannot manage the team
    await guest.goto("/admin/team");
    await expect(guest).toHaveURL(/owner_only/);

    // removed, the sign-in no longer opens the admin
    const row = member(page, TEST_STRANGER.email);
    await row.getByRole("button", { name: "Remove", exact: true }).click();
    await row.getByRole("dialog").getByRole("button", { name: "Yes, remove" }).click();
    await expect(member(page, TEST_STRANGER.email)).toHaveCount(0);

    await guest.goto("/admin/categories");
    await expect(guest).toHaveURL(/\/admin\/login/);
  } finally {
    await context.close();
    // whatever happened above, leave the guest account outside the team
    await page.goto("/admin/team");
    const left = member(page, TEST_STRANGER.email);
    if ((await left.count()) > 0) {
      await left.getByRole("button", { name: "Remove", exact: true }).click();
      await left.getByRole("dialog").getByRole("button", { name: "Yes, remove" }).click();
      await expect(member(page, TEST_STRANGER.email)).toHaveCount(0);
    }
  }
});

test("the database refuses team changes from anyone who is not an owner", async ({ request }) => {
  const url = process.env.SUPABASE_URL ?? "";
  const anon = process.env.SUPABASE_ANON_KEY ?? "";
  const call = (name: string, token: string, data: object) =>
    request.post(`${url}/rest/v1/rpc/${name}`, { headers: { apikey: anon, Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, data });

  // a viewer's own sign-in, the way the site's pages get one
  const login = await request.post(`${url}/auth/v1/token?grant_type=password`, {
    headers: { apikey: anon, "Content-Type": "application/json" },
    data: { email: TEST_VIEWER.email, password: TEST_VIEWER.password },
  });
  const viewerToken = (await login.json()).access_token as string;
  expect(viewerToken).toBeTruthy();

  // they see no team, and every change is answered "not_owner"
  expect(await (await call("team_members", viewerToken, {})).json()).toEqual([]);
  expect(await (await call("add_team_member", viewerToken, { p_email: TEST_STRANGER.email, p_role: "owner" })).json()).toBe("not_owner");
  expect(await (await call("set_team_role", viewerToken, { p_user: "00000000-0000-4000-8000-000000000000", p_role: "owner" })).json()).toBe("not_owner");
  expect(await (await call("remove_team_member", viewerToken, { p_user: "00000000-0000-4000-8000-000000000000" })).json()).toBe("not_owner");

  // and a visitor who is not signed in cannot even call them
  for (const [name, data] of [["team_members", {}], ["add_team_member", { p_email: "a@b.co", p_role: "owner" }]] as const) {
    expect((await call(name, anon, data)).ok(), name).toBe(false);
  }

  // the viewer's attempt changed nothing: the stranger is still not on the team
  const members = await page_members(request, url, anon);
  expect(members).not.toContain(TEST_STRANGER.email);
});

/** Emails of the team, as the owner (the admin session of this test run) sees them. */
async function page_members(request: import("@playwright/test").APIRequestContext, url: string, anon: string) {
  const login = await request.post(`${url}/auth/v1/token?grant_type=password`, {
    headers: { apikey: anon, "Content-Type": "application/json" },
    data: { email: TEST_ADMIN.email, password: TEST_ADMIN.password },
  });
  const token = (await login.json()).access_token as string;
  const response = await request.post(`${url}/rest/v1/rpc/team_members`, {
    headers: { apikey: anon, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    data: {},
  });
  return ((await response.json()) as { email: string }[]).map((row) => row.email);
}
