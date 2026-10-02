import { expect, test, unique } from "./fixtures";

test("a category can be created, validated, edited, hidden, reordered and deleted", async ({ page }) => {
  const slug = unique("e2e-cat");

  await page.goto("/admin/categories");
  await page.getByRole("link", { name: "Add category" }).click();
  await expect(page.getByRole("heading", { name: "New category" })).toBeVisible();

  // Required fields are validated on the server.
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("This field is required.").first()).toBeVisible();

  // The slug is suggested from the English name until it is edited by hand.
  await page.getByLabel("Arabic name").fill("فئة اختبار");
  await page.getByLabel("English name").fill("E2E Category");
  await expect(page.getByLabel("Slug")).toHaveValue("e2e-category");

  // A slug used by another category is rejected.
  await page.getByLabel("Slug").fill("mobiles");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("This slug is already used by another category.")).toBeVisible();

  await page.getByLabel("Slug").fill(slug);
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page).toHaveURL(/\/admin\/categories\?saved=created/);
  await expect(page.getByText("Category added.")).toBeVisible();

  const row = page.getByRole("row", { name: new RegExp(slug) });
  await expect(row).toBeVisible();
  await expect(row).toContainText("Visible");

  // Edit.
  await row.getByRole("link", { name: "Edit" }).click();
  await expect(page.getByRole("heading", { name: "Edit category" })).toBeVisible();
  await page.getByLabel("English name").fill("E2E Category Renamed");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Changes saved.")).toBeVisible();
  await expect(page.getByRole("row", { name: new RegExp(slug) })).toContainText("E2E Category Renamed");

  // Hide and show again.
  await page.getByRole("row", { name: new RegExp(slug) }).getByRole("button", { name: "Hide" }).click();
  await expect(page.getByRole("row", { name: new RegExp(slug) })).toContainText("Hidden");
  await page.getByRole("row", { name: new RegExp(slug) }).getByRole("button", { name: "Show" }).click();
  await expect(page.getByRole("row", { name: new RegExp(slug) })).toContainText("Visible");

  // Reorder: moving up puts it before the category that was above it.
  const slugsInOrder = async () =>
    (await page.locator("tbody tr td:nth-child(2)").allInnerTexts()).map((text) => text.trim());
  const before = await slugsInOrder();
  expect(before.at(-1)).toBe(slug);
  await page.getByRole("row", { name: new RegExp(slug) }).getByRole("button", { name: "Move up" }).click();
  await expect.poll(slugsInOrder).toEqual([...before.slice(0, -2), slug, before.at(-2)!]);

  // Delete with confirmation.
  await page.getByRole("row", { name: new RegExp(slug) }).getByRole("button", { name: "Delete", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("Delete category?");
  await dialog.getByRole("button", { name: "Yes, delete" }).click();
  await expect(page.getByRole("row", { name: new RegExp(slug) })).toHaveCount(0);
});

test("a category that still has products cannot be deleted", async ({ page }) => {
  await page.goto("/admin/categories");
  const mobiles = page.getByRole("row", { name: /mobiles/ });
  await expect(mobiles).toBeVisible();

  await mobiles.getByRole("button", { name: "Delete", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Yes, delete" }).click();
  await expect(dialog).toContainText("A category with products cannot be deleted.");

  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByRole("row", { name: /mobiles/ })).toBeVisible();
});
