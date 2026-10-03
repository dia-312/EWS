import { expect, test } from "./fixtures";

type Page = import("@playwright/test").Page;

/** Updates products from a small CSV file, through the same import page the owner uses. */
async function importCsv(page: Page, lines: string[]) {
  await page.goto("/admin/products/import");
  await page.locator("#import-file").setInputFiles({
    name: "update.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(`${lines.join("\r\n")}\r\n`, "utf8"),
  });
  await page.getByRole("button", { name: "Check the file" }).click();
  await page.getByRole("button", { name: /^Import \d+ products$/ }).click();
  await expect(page.locator("[data-import-done]")).toContainText("updated");
}

const requestFor = (page: Page, destination: string) => page.locator("[data-notification]", { hasText: destination });
const group = (page: Page, name: string) => page.locator(`[data-group='${name}']`);

test("the owner answers customers who asked to hear about a restock or a price drop", async ({ page, request }) => {
  const suffix = String(Date.now()).slice(-7);
  const phone = `+97059${suffix}`;
  const email = `price${suffix}@example.com`;
  const subscribe = (data: object) =>
    request.post("/api/notifications/subscribe", { data: { locale: "en", consent: true, ...data } });

  // the ids of the two products, the way a visitor's browser would find them
  const ids = await page.request
    .get(`${process.env.SUPABASE_URL}/rest/v1/products?select=id,slug&slug=in.(lg-8kg-front-load-washer,lg-43-smart-tv)`, {
      headers: { apikey: process.env.SUPABASE_ANON_KEY ?? "", Authorization: `Bearer ${process.env.SUPABASE_ANON_KEY ?? ""}` },
    })
    .then((response) => response.json() as Promise<{ id: string; slug: string }[]>);
  const washer = ids.find((row) => row.slug === "lg-8kg-front-load-washer")!.id;
  const tv = ids.find((row) => row.slug === "lg-43-smart-tv")!.id;

  expect((await subscribe({ productId: washer, type: "restock", contact: phone })).status()).toBe(201);
  expect((await subscribe({ productId: tv, type: "price_drop", contact: email })).status()).toBe(201);

  try {
    // ---- both are waiting: nothing has changed yet
    await page.goto("/admin");
    await expect(page.locator("[data-waiting-notifications]")).toContainText("waiting to hear from you");
    await page.goto("/admin/notifications");
    await expect(group(page, "waiting").locator("[data-notification]", { hasText: phone })).toBeVisible();
    await expect(group(page, "waiting").locator("[data-notification]", { hasText: email })).toBeVisible();
    await expect(group(page, "ready").locator("[data-notification]", { hasText: phone })).toHaveCount(0);

    // ---- the washer is back in stock: its request is ready, with a WhatsApp message in the customer's language
    await importCsv(page, ["slug,availability", "lg-8kg-front-load-washer,in_stock"]);
    await page.goto("/admin/notifications");
    const restock = group(page, "ready").locator("[data-notification]", { hasText: phone });
    await expect(restock).toContainText("Back in stock");
    const whatsapp = await restock.locator("[data-contact-link='whatsapp']").getAttribute("href");
    expect(whatsapp).toContain(`https://wa.me/97059${suffix}?text=`);
    expect(decodeURIComponent(whatsapp!)).toContain("LG 8 kg Front Load Washer is back in stock");
    expect(decodeURIComponent(whatsapp!)).toContain("/en/products/lg-8kg-front-load-washer");
    await expect(restock.locator("[data-contact-link='call']")).toHaveAttribute("href", `tel:${phone}`);

    // answering moves it to "Answered", where the contact buttons are gone
    await restock.getByRole("button", { name: /Mark as answered/ }).click();
    const answered = group(page, "notified").locator("[data-notification]", { hasText: phone });
    await expect(answered).toBeVisible();
    await expect(answered.locator("[data-contact-link]")).toHaveCount(0);

    // ---- the TV got cheaper: its price request is ready, as an email
    await importCsv(page, ["slug,price", "lg-43-smart-tv,1000"]);
    await page.goto("/admin/notifications");
    const cheaper = group(page, "ready").locator("[data-notification]", { hasText: email });
    await expect(cheaper).toContainText("Price drop");
    await expect(cheaper).toContainText("was");
    const mail = decodeURIComponent((await cheaper.locator("[data-contact-link='email']").getAttribute("href"))!);
    expect(mail).toContain(`mailto:${email}`);
    expect(mail).toMatch(/is now .*1,?000/);

    // ---- deleting removes the contact details
    for (const destination of [phone, email]) {
      const item = requestFor(page, destination);
      await item.getByRole("button", { name: "Delete", exact: true }).click();
      await item.getByRole("dialog").getByRole("button", { name: "Yes, delete" }).click();
      await expect(requestFor(page, destination)).toHaveCount(0);
    }
  } finally {
    // put the two products back exactly as the seed has them
    await importCsv(page, ["slug,availability,price", "lg-8kg-front-load-washer,out_of_stock,1900", "lg-43-smart-tv,in_stock,1250"]);
  }
});
