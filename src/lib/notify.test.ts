import { describe, expect, it } from "vitest";
import { effectivePrice, parseContact, readiness } from "./notify";

describe("parseContact", () => {
  it("accepts an email address, lower-cased", () => {
    expect(parseContact("  Sara@Example.COM ")).toEqual({ channel: "email", destination: "sara@example.com" });
  });

  it("accepts phone numbers however they are typed, including Arabic digits", () => {
    expect(parseContact("+970 59-123 4567")).toEqual({ channel: "other", destination: "+970591234567" });
    expect(parseContact("(059) 123.4567")).toEqual({ channel: "other", destination: "0591234567" });
    expect(parseContact("٠٥٩١٢٣٤٥٦٧")).toEqual({ channel: "other", destination: "0591234567" });
  });

  it("refuses anything else", () => {
    for (const bad of ["", "   ", "hello", "12345", "1".repeat(16), "a@b", "a b@c.com", "<x@y.com>", "x".repeat(201), "+97059abc4567", "javascript:alert(1)"]) {
      expect(parseContact(bad), bad).toBeNull();
    }
  });
});

describe("effectivePrice", () => {
  it("uses the offer price only when it is lower", () => {
    expect(effectivePrice(100, 80)).toBe(80);
    expect(effectivePrice(100, null)).toBe(100);
    expect(effectivePrice(100, 120)).toBe(100);
  });
});

describe("readiness", () => {
  const stocked = { availability: "in_stock", price: 100, offerPrice: null };

  it("a restock request is ready once the product is available again", () => {
    const request = { type: "restock", status: "pending", price_at_subscribe: null };
    expect(readiness(request, { ...stocked, availability: "out_of_stock" })).toBe("waiting");
    expect(readiness(request, stocked)).toBe("ready");
    expect(readiness(request, { ...stocked, availability: "limited" })).toBe("ready");
  });

  it("a price request is ready once the price the visitor pays is below what it was", () => {
    const request = { type: "price_drop", status: "pending", price_at_subscribe: 100 };
    expect(readiness(request, stocked)).toBe("waiting");
    expect(readiness(request, { ...stocked, price: 90 })).toBe("ready");
    expect(readiness(request, { ...stocked, offerPrice: 70 })).toBe("ready");
    expect(readiness(request, { ...stocked, price: 120 })).toBe("waiting");
  });

  it("a price request without a recorded price never counts as ready", () => {
    expect(readiness({ type: "price_drop", status: "pending", price_at_subscribe: null }, { ...stocked, price: 1 })).toBe("waiting");
  });

  it("an answered request stays answered", () => {
    expect(readiness({ type: "restock", status: "notified", price_at_subscribe: null }, stocked)).toBe("notified");
  });
});
