import { describe, expect, it } from "vitest";
import { fillDays, parseDays } from "./analytics";

describe("parseDays", () => {
  it("accepts the three offered periods and falls back to 30", () => {
    expect(parseDays("7")).toBe(7);
    expect(parseDays("90")).toBe(90);
    expect(parseDays(["7", "30"])).toBe(7);
    expect(parseDays("365")).toBe(30);
    expect(parseDays("abc")).toBe(30);
    expect(parseDays(undefined)).toBe(30);
  });
});

describe("fillDays", () => {
  it("returns one entry per day, oldest first, with zeros for quiet days", () => {
    const today = new Date("2026-10-04T12:00:00Z");
    const days = fillDays([{ day: "2026-10-03", views: 5 }, { day: "2026-09-01", views: 9 }], 3, today);
    expect(days).toEqual([
      { day: "2026-10-02", views: 0 },
      { day: "2026-10-03", views: 5 },
      { day: "2026-10-04", views: 0 },
    ]);
  });
});
