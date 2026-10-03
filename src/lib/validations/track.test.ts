import { describe, expect, it } from "vitest";
import { trackSchema } from "./track";

const ID = "00000000-0000-4000-8000-000000000000";

describe("trackSchema", () => {
  it("accepts the events the storefront sends", () => {
    expect(trackSchema.safeParse({ type: "page_view", sessionId: "abcd1234efgh" }).success).toBe(true);
    expect(trackSchema.safeParse({ type: "product_view", productId: ID }).success).toBe(true);
    expect(trackSchema.safeParse({ type: "search", query: "  iphone " }).data?.query).toBe("iphone");
    // a contact button outside a product page has no product
    expect(trackSchema.safeParse({ type: "whatsapp_click" }).success).toBe(true);
  });

  it("rejects unknown types, missing products or queries, and oversized or odd values", () => {
    expect(trackSchema.safeParse({ type: "drop_all_tables" }).success).toBe(false);
    expect(trackSchema.safeParse({ type: "product_view" }).success).toBe(false);
    expect(trackSchema.safeParse({ type: "share", productId: "nope" }).success).toBe(false);
    expect(trackSchema.safeParse({ type: "search" }).success).toBe(false);
    expect(trackSchema.safeParse({ type: "search", query: "x".repeat(201) }).success).toBe(false);
    expect(trackSchema.safeParse({ type: "page_view", sessionId: "has spaces!" }).success).toBe(false);
  });
});
