import { describe, expect, it } from "vitest";
import { shareTargets, withQrSource } from "./share";

const URL_ = "https://shop.example.com/en/products/iphone-15";

describe("shareTargets", () => {
  it("builds one link per service, each carrying the product link", () => {
    const targets = shareTargets(URL_, "iPhone 15 — 3,200 ₪");
    expect(targets.map((target) => target.key)).toEqual(["whatsapp", "facebook", "telegram", "email"]);

    const whatsapp = new URL(targets[0].href);
    expect(whatsapp.origin + whatsapp.pathname).toBe("https://wa.me/");
    expect(whatsapp.searchParams.get("text")).toBe(`iPhone 15 — 3,200 ₪ ${URL_}`);

    expect(new URL(targets[1].href).searchParams.get("u")).toBe(URL_);
    expect(new URL(targets[2].href).searchParams.get("url")).toBe(URL_);
    expect(targets[3].href.startsWith("mailto:?subject=")).toBe(true);
  });

  it("escapes characters that would break out of a query string", () => {
    const [whatsapp] = shareTargets(URL_, 'a&b=c "quoted" #tag');
    expect(new URL(whatsapp.href).searchParams.get("text")).toBe(`a&b=c "quoted" #tag ${URL_}`);
  });
});

describe("withQrSource", () => {
  it("marks the link as coming from a QR scan and keeps the rest", () => {
    expect(withQrSource(URL_)).toBe(`${URL_}?src=qr`);
    expect(withQrSource(`${URL_}?x=1`)).toBe(`${URL_}?x=1&src=qr`);
  });

  it("does not stack the marker", () => {
    expect(withQrSource(`${URL_}?src=qr`)).toBe(`${URL_}?src=qr`);
  });
});
