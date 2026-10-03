import { expect, test, unique } from "./fixtures";

test("the dashboard shows what visitors did", async ({ page, request }) => {
  // find a product id the same way the admin does
  await page.goto("/admin/products");
  await page.getByRole("row", { name: /iPhone 15/ }).getByRole("link", { name: "Edit" }).click();
  await expect(page).toHaveURL(/\/admin\/products\/[0-9a-f-]{36}$/);
  const productId = page.url().split("/").pop()!;

  const term = unique("e2e-term").replaceAll("-", " ");
  const session = unique("e2esession").replaceAll("-", "");
  const send = (data: object) => request.post("/api/track", { data: { sessionId: session, ...data } });

  for (let index = 0; index < 3; index++) await send({ type: "product_view", productId });
  await send({ type: "whatsapp_click", productId });
  await send({ type: "search", query: term });
  await send({ type: "search", query: ` ${term.toUpperCase()} ` });

  await page.goto("/admin");
  const panel = page.locator("[data-analytics]");
  await expect(panel.getByRole("heading", { name: "Visitor statistics" })).toBeVisible();
  await expect(panel.locator("[data-stat='productViews'] dd")).not.toHaveText("0");
  await expect(panel.locator("[data-stat='whatsapp'] dd")).not.toHaveText("0");

  const row = panel.locator("[data-top-products] tbody tr", { hasText: "iPhone 15" });
  await expect(row).toBeVisible();
  await expect(row.getByRole("link", { name: "iPhone 15" })).toHaveAttribute("href", `/admin/products/${productId}`);

  // searches are grouped without regard to case or surrounding spaces
  await expect(panel.locator("[data-top-searches] li", { hasText: term })).toContainText("2");

  // the period buttons keep working
  await panel.getByRole("link", { name: "Last 7 days" }).click();
  await expect(page).toHaveURL(/days=7/);
  await expect(page.locator("[data-analytics]").getByRole("link", { name: "Last 7 days" })).toHaveAttribute("aria-current", "true");
});
