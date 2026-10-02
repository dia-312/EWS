import { TEST_ADMIN, TEST_STRANGER, TEST_VIEWER } from "./credentials";
import { expect, test } from "./fixtures";

async function signIn(page: import("@playwright/test").Page, email: string, password: string) {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

test("admin pages are not reachable without signing in", async ({ page }) => {
  for (const path of ["/admin", "/admin/products", "/admin/categories", "/admin/settings", "/admin/appearance"]) {
    await page.goto(path);
    await expect(page, `${path} should lead to the login page`).toHaveURL(/\/admin\/login/);
    await expect(page.getByRole("heading", { name: "Admin sign in" })).toBeVisible();
  }
});

test("wrong or missing credentials show an error and stay on the login page", async ({ page }) => {
  await signIn(page, TEST_ADMIN.email, "definitely-wrong");
  await expect(page.getByText("Incorrect email or password.")).toBeVisible();
  await expect(page).toHaveURL(/\/admin\/login/);

  await page.goto("/admin/login");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("Enter a valid email address and your password.")).toBeVisible();
});

test("the owner signs in, sees the dashboard numbers and signs out", async ({ page }) => {
  await signIn(page, TEST_ADMIN.email, TEST_ADMIN.password);
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { name: `Welcome, ${TEST_ADMIN.displayName}` })).toBeVisible();

  // Seed data: 12 active products, 1 live offer, 1 out of stock.
  await expect(page.locator("dl > div", { hasText: "Active products" })).toContainText("12");
  await expect(page.locator("dl > div", { hasText: "Products on sale" })).toContainText("1");
  await expect(page.locator("dl > div", { hasText: "Out-of-stock products" })).toContainText("1");

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/admin\/login/);
  await page.goto("/admin/products");
  await expect(page).toHaveURL(/\/admin\/login/);
});

test("a signed-in account that is not an admin of the store is refused", async ({ page }) => {
  await signIn(page, TEST_STRANGER.email, TEST_STRANGER.password);
  await expect(page).toHaveURL(/\/admin\/login/);
  await expect(page.getByText("This account is not allowed to access this store's dashboard.")).toBeVisible();

  await page.goto("/admin/products");
  await expect(page).toHaveURL(/\/admin\/login/);
});

test("a viewer can look but not change anything", async ({ page }) => {
  await signIn(page, TEST_VIEWER.email, TEST_VIEWER.password);
  await expect(page).toHaveURL(/\/admin$/);

  await page.getByRole("link", { name: "Categories" }).click();
  await expect(page.getByRole("heading", { name: "Categories" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Add category" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Delete" })).toHaveCount(0);

  await page.goto("/admin/categories/new");
  await expect(page).toHaveURL(/\/admin\?error=read_only/);
  await expect(page.getByText("Your account is read-only and cannot make changes.")).toBeVisible();

  await page.goto("/admin/products/new");
  await expect(page).toHaveURL(/\/admin\?error=read_only/);
});
