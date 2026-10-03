import { expect, test } from "./fixtures";

/** Families of the font faces the browser has actually loaded on this page. */
async function loadedFamilies(page: import("@playwright/test").Page) {
  return page.evaluate(async () => {
    await document.fonts.ready;
    return [...new Set([...document.fonts].filter((face) => face.status === "loaded").map((face) => face.family.replace(/"/g, "")))];
  });
}

test("the site's fonts come from the site itself, not from Google", async ({ page, baseURL }) => {
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));

  await page.goto("/ar/products");
  await expect(page.getByRole("heading", { name: "كل المنتجات" })).toBeVisible();
  const families = await loadedFamilies(page);

  // the default font renders the Arabic text
  expect(families).toContain("Tajawal");
  expect(await page.evaluate(() => getComputedStyle(document.body).fontFamily)).toContain("Tajawal");

  const fontRequests = requests.filter((url) => /\.(woff2?|ttf|otf)(\?|$)/.test(url) || /fonts\.(googleapis|gstatic)\.com/.test(url));
  expect(fontRequests.length).toBeGreaterThan(0);
  for (const url of fontRequests) {
    expect(new URL(url).origin, `font loaded from ${url}`).toBe(new URL(baseURL!).origin);
  }
  expect(requests.filter((url) => /fonts\.(googleapis|gstatic)\.com/.test(url))).toEqual([]);
});

test("fonts the theme does not use are not downloaded", async ({ page }) => {
  const fontFiles: string[] = [];
  page.on("request", (request) => {
    if (/\.woff2?(\?|$)/.test(request.url())) fontFiles.push(request.url());
  });

  await page.goto("/en");
  await page.evaluate(() => document.fonts.ready);

  const families = await loadedFamilies(page);
  expect(families).toContain("Tajawal");
  expect(families).not.toContain("Cairo");
  expect(families).not.toContain("IBM Plex Sans Arabic");
  expect(fontFiles.length).toBeGreaterThan(0);
  expect(fontFiles.length).toBeLessThanOrEqual(8); // only the default font (its weights and the Arabic/Latin parts in use), not all three families
});
