import { describe, expect, it } from "vitest";
import { escapeLike, normalizeSearch } from "./search";

describe("normalizeSearch", () => {
  it("unifies alef forms, ya and ta marbuta", () => {
    expect(normalizeSearch("أجهزة إلكترونية")).toBe("اجهزه الكترونيه");
    expect(normalizeSearch("سماعة")).toBe("سماعه");
    expect(normalizeSearch("موسى")).toBe("موسي");
  });

  it("strips tashkeel and tatweel", () => {
    expect(normalizeSearch("مُحَمَّد")).toBe("محمد");
    expect(normalizeSearch("ســماعة")).toBe("سماعه");
  });

  it("lowercases and removes Latin accents", () => {
    expect(normalizeSearch("  iPhone   15 PRO ")).toBe("iphone 15 pro");
    expect(normalizeSearch("Café")).toBe("cafe");
  });

  it("makes a query match the stored search text regardless of spelling", () => {
    const stored = normalizeSearch("سامسونج جالاكسي A55");
    expect(stored).toContain(normalizeSearch("جالاكسي"));
    expect(stored).toContain(normalizeSearch("a55"));
  });
});

describe("escapeLike", () => {
  it("escapes wildcard characters", () => {
    expect(escapeLike("50%_off")).toBe("50\\%\\_off");
  });
});
