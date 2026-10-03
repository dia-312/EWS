import { expect, test } from "./fixtures";

type Page = import("@playwright/test").Page;
type Locator = import("@playwright/test").Locator;

/**
 * Picks an item up with the keyboard (Space), moves it by `steps` places (negative = up) and
 * drops it (Space). `check` says what the list must look like afterwards; if the attempt did
 * not get there (a key pressed a moment too early), it is cancelled and tried again.
 */
async function dragWithKeyboard(page: Page, handle: Locator, steps: number, check: () => Promise<void>) {
  // the handles only work once the page has hydrated
  await expect(page.locator("[data-sortable-ready]").first()).toHaveAttribute("data-sortable-ready", "true");

  await expect(async () => {
    await page.keyboard.press("Escape"); // cancels a drag left over from an earlier attempt
    await handle.focus();
    await page.keyboard.press("Space");
    await expect(page.locator("[id^='DndLiveRegion']")).toContainText(/Picked up|is now at position/, { timeout: 1500 });
    await page.waitForTimeout(200); // the arrow keys are listened to a moment after the pick-up
    for (let index = 0; index < Math.abs(steps); index++) {
      await page.keyboard.press(steps < 0 ? "ArrowUp" : "ArrowDown");
      await page.waitForTimeout(250);
    }
    await page.keyboard.press("Space");
    await check();
  }).toPass({ timeout: 30_000 });
}

const sectionNames = (page: Page) => page.locator("[data-section-name]").allInnerTexts();
const quickly = { timeout: 3000 };

test("homepage sections can be reordered by dragging, with the keyboard, and the order is kept", async ({ page }) => {
  await page.goto("/admin/homepage");
  const before = await sectionNames(page);
  const from = before.indexOf("Why choose us");
  expect(from).toBeGreaterThan(0);

  const expected = [...before];
  [expected[from - 1], expected[from]] = [expected[from], expected[from - 1]];

  await dragWithKeyboard(page, page.getByRole("button", { name: "Drag to reorder: Why choose us" }), -1, () =>
    expect.poll(() => sectionNames(page), quickly).toEqual(expected),
  );
  await expect(page.locator("[data-reorder-status]")).toContainText("Why choose us moved to position");

  // saved: still there after a reload, and the storefront follows
  await page.reload();
  expect(await sectionNames(page)).toEqual(expected);

  await expect(async () => {
    await page.goto("/en");
    const labels = await page.locator("main section[aria-label]").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("aria-label")));
    // the section it swapped places with (the admin and the storefront word a few names slightly differently)
    const displaced = before[from - 1];
    const at = (name: string) => labels.findIndex((label) => label?.startsWith(name));
    const shown = `storefront: ${labels.join(" | ")} -- expected admin order: ${expected.join(" | ")}`;
    expect(at("Why choose us"), shown).toBeGreaterThanOrEqual(0);
    expect(at(displaced), shown).toBeGreaterThanOrEqual(0);
    expect(at("Why choose us"), shown).toBeLessThan(at(displaced));
  }).toPass({ timeout: 15_000 });

  // put it back
  await page.goto("/admin/homepage");
  await dragWithKeyboard(page, page.getByRole("button", { name: "Drag to reorder: Why choose us" }), 1, () =>
    expect.poll(() => sectionNames(page), quickly).toEqual(before),
  );
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

  const expected = [...before];
  [expected[0], expected[1]] = [expected[1], expected[0]];

  await dragWithKeyboard(page, page.locator("[data-drag-handle]").nth(0), 1, () => expect.poll(slugs, quickly).toEqual(expected));

  await page.reload();
  expect(await slugs()).toEqual(expected);

  // the storefront's category order follows
  await page.goto("/en");
  const hrefs = await page.locator("main section[aria-label='Shop by category'] li a").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("href")));
  expect(hrefs.map((href) => href!.split("/").pop())).toEqual(expected);

  await page.goto("/admin/categories");
  await dragWithKeyboard(page, page.locator("[data-drag-handle]").nth(0), 1, () => expect.poll(slugs, quickly).toEqual(before));
  await page.reload();
  expect(await slugs()).toEqual(before);
});
