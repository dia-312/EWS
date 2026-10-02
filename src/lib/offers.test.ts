import { describe, expect, it } from "vitest";
import { discountPercent, offerStatus } from "./offers";

const now = new Date("2026-10-10T12:00:00Z");

describe("offerStatus", () => {
  it("is live inside its window, and with no dates at all", () => {
    expect(offerStatus({ active: true, start_at: null, end_at: null }, now)).toBe("live");
    expect(offerStatus({ active: true, start_at: "2026-10-09T00:00:00Z", end_at: "2026-10-11T00:00:00Z" }, now)).toBe("live");
  });

  it("is scheduled before it starts and expired after it ends", () => {
    expect(offerStatus({ active: true, start_at: "2026-10-11T00:00:00Z", end_at: null }, now)).toBe("scheduled");
    expect(offerStatus({ active: true, start_at: null, end_at: "2026-10-10T12:00:00Z" }, now)).toBe("expired");
  });

  it("is inactive when switched off, whatever the dates", () => {
    expect(offerStatus({ active: false, start_at: null, end_at: null }, now)).toBe("inactive");
    expect(offerStatus({ active: false, start_at: "2026-10-09T00:00:00Z", end_at: "2026-10-11T00:00:00Z" }, now)).toBe("inactive");
  });
});

describe("discountPercent", () => {
  it("rounds to a whole percent", () => {
    expect(discountPercent(1350, 1150)).toBe(15);
    expect(discountPercent(100, 66.6)).toBe(33);
  });

  it("is null when the new price is not lower or the old price is unusable", () => {
    expect(discountPercent(100, 100)).toBeNull();
    expect(discountPercent(100, 120)).toBeNull();
    expect(discountPercent(0, 0)).toBeNull();
  });
});
