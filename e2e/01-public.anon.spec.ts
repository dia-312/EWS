import { expect, test } from "./fixtures";

test("the root address leads to the default language", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/ar$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "ar");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("banner").getByText("EWS Electronics")).toBeVisible();
});

test("the home page carries the store theme", async ({ page }) => {
  await page.goto("/ar");
  const style = (await page.locator(".theme-root").getAttribute("style")) ?? "";
  expect(style).toContain("--primary:#2563eb");
  expect(style).toContain("--font-store:var(--font-tajawal)");
});

test("the English site is left-to-right", async ({ page }) => {
  await page.goto("/en");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
});

test("the Arabic admin login is right-to-left", async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: "NEXT_LOCALE", value: "ar", url: baseURL! }]);
  await page.goto("/admin/login");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.locator("html")).toHaveAttribute("lang", "ar");
  await expect(page.getByRole("heading", { name: "تسجيل دخول الإدارة" })).toBeVisible();
});
