import { describe, expect, it } from "vitest";
import { telUrl, whatsappUrl } from "./contact";

describe("telUrl", () => {
  it("keeps digits and a leading plus only", () => {
    expect(telUrl("+970 (59) 123-4567")).toBe("tel:+970591234567");
    expect(telUrl("059 123 4567")).toBe("tel:0591234567");
    expect(telUrl("00970+59")).toBe("tel:0097059");
  });
});

describe("whatsappUrl", () => {
  it("builds a wa.me link with the message encoded", () => {
    const url = whatsappUrl("970591234567", "مرحبًا، أريد iPhone 15 — https://x.test/p?a=1&b=2");
    expect(url.startsWith("https://wa.me/970591234567?text=")).toBe(true);
    const text = new URL(url).searchParams.get("text");
    expect(text).toBe("مرحبًا، أريد iPhone 15 — https://x.test/p?a=1&b=2");
  });

  it("works without a message and strips non-digits from the number", () => {
    expect(whatsappUrl("+970 59 123")).toBe("https://wa.me/97059123");
  });
});
