import { expect, test } from "./fixtures";

test("the theme can be customized with a contrast check and shows on the public site", async ({ page }) => {
  await page.goto("/admin/appearance");
  await expect(page.getByRole("heading", { name: "Store appearance" })).toBeVisible();

  // Choosing a preset loads its values.
  await page.getByLabel("Preset").selectOption({ label: "Gaming (dark)" });
  await expect(page.locator("#primary_color")).toHaveValue("#8b5cf6");
  await expect(page.locator("#surface_color")).toHaveValue("#0b0f19");

  // Unreadable text is blocked before saving.
  await page.getByLabel("Preset").selectOption({ label: "Modern" });
  await page.locator("#text_color").fill("#eeeeee");
  await expect(page.getByText("The text is hard to read on the background.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Save" })).toBeDisabled();

  // A valid customization saves and reaches the public site.
  await page.getByRole("button", { name: "Reset to preset values" }).click();
  await page.getByLabel("Preset").selectOption({ label: "Gaming (dark)" });
  await page.locator("#primary_color").fill("#e11d48");
  await page.getByLabel("Corner style").selectOption({ label: "Pill" });
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Appearance saved.")).toBeVisible();

  await page.goto("/");
  const style = (await page.locator(".theme-root").getAttribute("style")) ?? "";
  expect(style).toContain("--primary:#e11d48");
  expect(style).toContain("--background:#111827");
  expect(style).toContain("--ui-radius-lg:9999px");
  expect(style).toContain("--font-store:var(--font-cairo)");

  // The admin area keeps its neutral colors.
  await page.goto("/admin");
  await expect(page.locator(".theme-root")).toHaveCount(0);

  // Restore the default look.
  await page.goto("/admin/appearance");
  await expect(page.locator("#primary_color")).toHaveValue("#e11d48");
  await page.getByLabel("Preset").selectOption({ label: "Modern" });
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Appearance saved.")).toBeVisible();

  await page.goto("/");
  expect((await page.locator(".theme-root").getAttribute("style")) ?? "").toContain("--primary:#2563eb");
});
