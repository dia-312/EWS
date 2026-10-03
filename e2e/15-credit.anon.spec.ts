import { expect, test } from "./fixtures";

test.describe("the developer's credit", () => {
  test("shows the developer in the footer of both languages, apart from the shop's own line", async ({ page }) => {
    await page.goto("/en");
    const footer = page.getByRole("contentinfo");
    const credit = footer.locator("[data-developer-credit]");
    await expect(credit).toContainText("Website by Dia'a Yaqub Arar");
    await expect(credit.getByRole("link", { name: "+972 56 820 7267" })).toHaveAttribute("href", "tel:+972568207267");

    // the shop's copyright line is untouched and does not mention the developer
    const copyright = footer.getByText(/All rights reserved/);
    await expect(copyright).toContainText("EWS Electronics");
    await expect(copyright).not.toContainText("Dia'a");

    await page.goto("/ar");
    await expect(page.locator("[data-developer-credit]")).toContainText("تطوير الموقع: ضياء يعقوب عرار");
  });

  test("is on every kind of public page", async ({ page }) => {
    for (const path of ["/en/products", "/en/products/iphone-15", "/ar/favorites"]) {
      await page.goto(path);
      await expect(page.locator("[data-developer-credit]"), path).toBeVisible();
    }
  });

  test("is not a contact button of the shop: tapping it is not counted as a call to the shop", async ({ page }) => {
    const tracked: string[] = [];
    page.on("request", (request) => {
      if (request.url().endsWith("/api/track")) tracked.push(String(request.postDataJSON()?.type));
    });
    await page.goto("/en");
    const link = page.locator("[data-developer-credit] a");
    await expect(link).not.toHaveAttribute("data-contact", /.+/);
    // click it without leaving the page
    await link.evaluate((element) => element.addEventListener("click", (event) => event.preventDefault()));
    await link.click();
    await page.waitForTimeout(400);
    expect(tracked).not.toContain("phone_click");
  });
});
