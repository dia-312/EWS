import { expect, test } from "./fixtures";

test("the public home page shows the store from the database", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "EWS Electronics" })).toBeVisible();
  await expect(page.getByText("12 products")).toBeVisible();
});

test("the home page carries the store theme", async ({ page }) => {
  await page.goto("/");
  const style = (await page.locator(".theme-root").getAttribute("style")) ?? "";
  expect(style).toContain("--primary:#2563eb");
  expect(style).toContain("--font-store:var(--font-tajawal)");
});

test("the Arabic admin login is right-to-left", async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: "NEXT_LOCALE", value: "ar", url: baseURL! }]);
  await page.goto("/admin/login");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.locator("html")).toHaveAttribute("lang", "ar");
  await expect(page.getByRole("heading", { name: "تسجيل دخول الإدارة" })).toBeVisible();
});
