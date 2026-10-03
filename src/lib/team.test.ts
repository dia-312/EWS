import { describe, expect, it } from "vitest";
import { checkNewPassword, emailSchema, isTeamRole } from "./team";

describe("isTeamRole", () => {
  it("accepts the four roles only", () => {
    for (const role of ["owner", "manager", "editor", "viewer"]) expect(isTeamRole(role)).toBe(true);
    for (const role of ["admin", "Owner", "", null, undefined, 3]) expect(isTeamRole(role)).toBe(false);
  });
});

describe("emailSchema", () => {
  it("trims and lower-cases a valid address and refuses anything else", () => {
    expect(emailSchema.parse("  Sara@Example.COM ")).toBe("sara@example.com");
    for (const bad of ["", "nope", "a@b", "a b@c.com"]) expect(emailSchema.safeParse(bad).success, bad).toBe(false);
  });
});

describe("checkNewPassword", () => {
  it("wants at least ten characters, twice the same, and not the email address", () => {
    expect(checkNewPassword("short", "short", undefined)).toBe("too_short");
    expect(checkNewPassword("a-long-enough-password", "a-different-one-entirely", undefined)).toBe("mismatch");
    expect(checkNewPassword("owner@example.com", "owner@example.com", "Owner@Example.com")).toBe("same_as_email");
    expect(checkNewPassword("a-long-enough-password", "a-long-enough-password", "owner@example.com")).toBeNull();
  });
});
