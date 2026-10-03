import { TEST_SESSION_OWNER } from "./credentials";
import { expect, test } from "./fixtures";

type Page = import("@playwright/test").Page;

const CHANGED = "e2e-only-Changed#2026";

async function signIn(page: Page, password: string) {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(TEST_SESSION_OWNER.email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

async function changePassword(page: Page, to: string) {
  await page.goto("/admin/account");
  const form = page.locator("[data-password-form]");
  await form.getByLabel("New password", { exact: true }).fill(to);
  await form.getByLabel("Repeat the new password").fill(to);
  await form.getByRole("button", { name: "Change password" }).click();
  await expect(form.getByRole("status")).toHaveText("Your password was changed.");
}

test("a signed-in person sees their account and changes their own password", async ({ browser, baseURL }) => {
  // the sign-in/sign-out account, in a browser of its own, so the shared admin session is untouched
  const context = await browser.newContext({ baseURL, storageState: { cookies: [], origins: [] } });
  await context.addCookies([{ name: "NEXT_LOCALE", value: "en", url: baseURL! }]);
  const page = await context.newPage();
  let current = TEST_SESSION_OWNER.password;

  try {
    await signIn(page, current);
    await expect(page).toHaveURL(/\/admin$/);
    await page.getByRole("link", { name: TEST_SESSION_OWNER.email }).click();
    await expect(page.getByRole("heading", { name: "My account" })).toBeVisible();
    const details = page.locator("[data-account]");
    await expect(details).toContainText(TEST_SESSION_OWNER.displayName);
    await expect(details).toContainText(TEST_SESSION_OWNER.email);
    await expect(details).toContainText("Owner");

    // the form says what is wrong before it asks the sign-in service anything
    const form = page.locator("[data-password-form]");
    await form.getByLabel("New password", { exact: true }).fill("short");
    await form.getByLabel("Repeat the new password").fill("short");
    await form.getByRole("button", { name: "Change password" }).click();
    await expect(form.getByText("The password is too short.")).toBeVisible();

    await form.getByLabel("New password", { exact: true }).fill(CHANGED);
    await form.getByLabel("Repeat the new password").fill(`${CHANGED}x`);
    await form.getByRole("button", { name: "Change password" }).click();
    await expect(form.getByText("The two passwords are not the same.")).toBeVisible();

    // a valid change goes through
    await changePassword(page, CHANGED);
    current = CHANGED;

    // the old password no longer works, the new one does
    await page.getByRole("button", { name: "Sign out" }).click();
    await signIn(page, TEST_SESSION_OWNER.password);
    await expect(page.getByText("Incorrect email or password.")).toBeVisible();
    await signIn(page, CHANGED);
    await expect(page).toHaveURL(/\/admin$/);
  } finally {
    // put the original password back, so the account works again for the next run
    if (current !== TEST_SESSION_OWNER.password) {
      await signIn(page, current);
      await changePassword(page, TEST_SESSION_OWNER.password);
    }
    await context.close();
  }
});
