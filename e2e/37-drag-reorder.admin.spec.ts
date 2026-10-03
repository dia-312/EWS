import { expect, test } from "./fixtures";

type Page = import("@playwright/test").Page;
type Locator = import("@playwright/test").Locator;

/** Picks an item up with the keyboard, moves it by `steps` places (negative = up) and drops it. */
async function dragWithKeyboard(page: Page, handle: Locator, steps: number) {
  // the handles only work once the page has hydrated
  await expect(page.locator("[data-sortable-ready]").first()).toHaveAttribute("data-sortable-ready", "true");
  // Keys pressed before the page has hydrated are lost, so confirm the item was picked up (and retry if not).
  await expect(async () => {
    await handle.focus();
    await page.keyboard.press("Space");
    await expect(page.locator("[id^='DndLiveRegion']")).toContainText(/Picked up|is now at position/, { timeout: 1500 });
  }).toPass({ timeout: 15_000 });
  const key = steps < 0 ? "ArrowUp" : "ArrowDown";
  for (let index = 0; index < Math.abs(steps); index++) {
    await page.keyboard.press(key);
    await page.waitForTimeout(250);
  }
  await page.keyboard.press("Space");
}

const sectionNames = (page: Page) => page.locator("[data-section-name]").allInnerTexts();

test("homepage sections can be reordered by dragging, with the keyboard, and the order is kept", async ({ page }) => {
  await page.goto("/admin/homepage");
  const before = await sectionNames(page);
  const from = before.indexOf("Why choose us");
  expect(from).toBeGreaterThan(0);

  await dragWithKeyboard(page, page.getByRole("button", { name: "Drag to reorder: Why choose us" }), -1);
  await expect(page.locator("[data-reorder-status]")).toContainText("Why choose us moved to position");

  const expected = [...before];
  [expected[from - 1], expected[from]] = [expected[from], expected[from - 1]];
  await expect.poll(() => sectionNames(page)).toEqual(expected);

  // saved: still there after a reload, and the storefront follows
  await page.reload();
  expect(await sectionNames(page)).toEqual(expected);
  await expect(async () => {
    await page.goto("/en");
    const labels = await page.locator("main section[aria-label]").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("aria-label")));
    expect(labels.indexOf("Why choose us")).toBeGreaterThanOrEqual(0);
    expect(labels.indexOf("Why choose us")).toBeLessThan(labels.indexOf("Deal of the day"));
  }).toPass({ timeout: 15_000 });

  // put it back
  await page.goto("/admin/homepage");
  await dragWithKeyboard(page, page.getByRole("button", { name: "Drag to reorder: Why choose us" }), 1);
  await expect.poll(() => sectionNames(page)).toEqual(before);
  await page.reload();
  expect(await sectionNames(page)).toEqual(before);
});

test("the arrow buttons still work next to the drag handles", async ({ page }) => {
  await page.goto("/admin/homepage");
  const before = await sectionNames(page);
  await page.getByRole("button", { name: "Move down: Hero banner" }).click();
  await expect.poll(async () => (await sectionNames(page))[1]).toBe("Hero banner");
  await page.getByRole("button", { name: "Move up: Hero banner" }).click();
  await expect.poll(() => sectionNames(page)).toEqual(before);
});

test("categories can be reordered by dragging", async ({ page }) => {
  await page.goto("/admin/categories");
  const slugs = () => page.locator("tbody tr[data-sortable-id] td[dir='ltr']").allInnerTexts();
  const before = await slugs();
  expect(before.length).toBeGreaterThanOrEqual(3);

  await dragWithKeyboard(page, page.locator("[data-drag-handle]").nth(0), 1);
  const expected = [...before];
  [expected[0], expected[1]] = [expected[1], expected[0]];
  await expect.poll(slugs).toEqual(expected);

  await page.reload();
  expect(await slugs()).toEqual(expected);

  // the storefront's category order follows
  await page.goto("/en");
  const names = await page.locator("main section[aria-label='Shop by category'] li a").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("href")));
  expect(names.map((href) => href!.split("/").pop())).toEqual(expected);

  await page.goto("/admin/categories");
  await dragWithKeyboard(page, page.locator("[data-drag-handle]").nth(0), 1);
  await expect.poll(slugs).toEqual(before);
  await page.reload();
  expect(await slugs()).toEqual(before);
});
