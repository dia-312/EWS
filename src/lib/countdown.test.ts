import { describe, expect, it } from "vitest";
import { splitDuration } from "@/components/storefront/offer-countdown";

describe("splitDuration", () => {
  it("splits milliseconds into days, hours, minutes and seconds", () => {
    const ms = ((2 * 24 + 3) * 3600 + 4 * 60 + 5) * 1000;
    expect(splitDuration(ms)).toEqual({ days: 2, hours: 3, minutes: 4, seconds: 5 });
  });

  it("never goes negative", () => {
    expect(splitDuration(-5000)).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  });
});
