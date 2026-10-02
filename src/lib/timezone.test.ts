import { describe, expect, it } from "vitest";
import { utcToZonedInput, zonedTimeToUtc } from "./timezone";

const HEBRON = "Asia/Hebron";

describe("zonedTimeToUtc", () => {
  it("applies the winter offset (UTC+2)", () => {
    expect(zonedTimeToUtc("2026-01-15T10:00", HEBRON)?.toISOString()).toBe("2026-01-15T08:00:00.000Z");
  });

  it("applies the summer offset (UTC+3)", () => {
    expect(zonedTimeToUtc("2026-07-15T10:00", HEBRON)?.toISOString()).toBe("2026-07-15T07:00:00.000Z");
  });

  it("works for zones without daylight saving and for UTC", () => {
    expect(zonedTimeToUtc("2026-07-15T10:00", "Asia/Riyadh")?.toISOString()).toBe("2026-07-15T07:00:00.000Z");
    expect(zonedTimeToUtc("2026-07-15T10:00", "UTC")?.toISOString()).toBe("2026-07-15T10:00:00.000Z");
  });

  it("rejects malformed and impossible values", () => {
    for (const bad of ["", "2026-07-15", "2026-07-15 10:00", "2026-02-31T10:00", "2026-07-15T25:00", "x"]) {
      expect(zonedTimeToUtc(bad, HEBRON), bad).toBeNull();
    }
  });
});

describe("utcToZonedInput", () => {
  it("shows the store's wall-clock time", () => {
    expect(utcToZonedInput("2026-01-15T08:00:00Z", HEBRON)).toBe("2026-01-15T10:00");
    expect(utcToZonedInput("2026-07-15T07:00:00Z", HEBRON)).toBe("2026-07-15T10:00");
  });

  it("round-trips through zonedTimeToUtc across the year", () => {
    for (const local of ["2026-01-01T00:00", "2026-03-28T23:30", "2026-06-15T12:45", "2026-10-30T08:15", "2026-12-31T23:59"]) {
      const utc = zonedTimeToUtc(local, HEBRON)!;
      expect(utcToZonedInput(utc, HEBRON)).toBe(local);
    }
  });
});
