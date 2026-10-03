import { describe, expect, it } from "vitest";
import { decodeCsvBytes, detectDelimiter, guardFormula, parseCsv, toCsv, unguardFormula } from "./csv";

describe("parseCsv", () => {
  it("reads plain rows, CRLF and a missing final newline", () => {
    expect(parseCsv("a,b\r\n1,2\r\n3,4")).toEqual([
      ["a", "b"],
      ["1", "2"],
      ["3", "4"],
    ]);
  });

  it("handles quotes, doubled quotes, commas and line breaks inside a cell", () => {
    expect(parseCsv('name,note\n"Cable, 2m","He said ""hi""\nsecond line"\n')).toEqual([
      ["name", "note"],
      ["Cable, 2m", 'He said "hi"\nsecond line'],
    ]);
  });

  it("drops a BOM and empty rows, and keeps empty cells", () => {
    expect(parseCsv("﻿a,b,c\n\n1,,3\n,,\n")).toEqual([
      ["a", "b", "c"],
      ["1", "", "3"],
    ]);
  });

  it("reads Arabic text and semicolon files as saved by Arabic-region Excel", () => {
    expect(parseCsv("الاسم;السعر\nسماعة;120\n")).toEqual([
      ["الاسم", "السعر"],
      ["سماعة", "120"],
    ]);
  });
});

describe("detectDelimiter", () => {
  it("picks the separator used in the first line", () => {
    expect(detectDelimiter("a;b;c\n1,2,3")).toBe(";");
    expect(detectDelimiter("a\tb\n")).toBe("\t");
    expect(detectDelimiter("single")).toBe(",");
    expect(detectDelimiter('"a;b",c,d\n')).toBe(",");
  });
});

describe("toCsv", () => {
  it("round-trips awkward cells and starts with a BOM so Excel reads UTF-8", () => {
    const rows = [
      ["name", "note"],
      ['Cable, "2m"', "line1\nline2"],
      ["سماعة", ""],
    ];
    const text = toCsv(rows);
    expect(text.startsWith("﻿")).toBe(true);
    expect(parseCsv(text)).toEqual(rows);
  });
});

describe("formula guard", () => {
  it("protects text a spreadsheet would run, and undoes it on the way back", () => {
    expect(guardFormula("=SUM(A1)")).toBe("'=SUM(A1)");
    expect(guardFormula("+Pro cable")).toBe("'+Pro cable");
    expect(guardFormula("Normal")).toBe("Normal");
    expect(unguardFormula("'=SUM(A1)")).toBe("=SUM(A1)");
    expect(unguardFormula("'quoted text")).toBe("'quoted text");
    expect(unguardFormula(guardFormula("-5 V adapter"))).toBe("-5 V adapter");
  });
});

describe("decodeCsvBytes", () => {
  it("decodes UTF-8 and falls back to Windows Arabic", () => {
    expect(decodeCsvBytes(new TextEncoder().encode("سماعة"))).toBe("سماعة");
    // "سماعة" in windows-1256
    expect(decodeCsvBytes(Uint8Array.from([0xd3, 0xe3, 0xc7, 0xda, 0xc9]))).toBe("سماعة");
  });
});
