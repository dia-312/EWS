/**
 * Reading and writing CSV the way shop owners actually produce it: saved from
 * Excel (UTF-8 with a BOM, or the old Windows Arabic encoding), with commas or,
 * on Arabic/European systems, semicolons between the columns.
 */

/** Text from the bytes of a file: UTF-8 when valid, otherwise Windows Arabic (what old Excel writes). */
export function decodeCsvBytes(bytes: Uint8Array): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    try {
      return new TextDecoder("windows-1256").decode(bytes);
    } catch {
      return new TextDecoder("latin1").decode(bytes);
    }
  }
}

const DELIMITERS = [",", ";", "\t"] as const;

/** The separator used in the first line (outside quotes). Comma when nothing stands out. */
export function detectDelimiter(text: string): string {
  const counts = new Map<string, number>(DELIMITERS.map((delimiter) => [delimiter, 0]));
  let quoted = false;
  for (const char of text) {
    if (char === '"') quoted = !quoted;
    else if (!quoted && (char === "\n" || char === "\r")) break;
    else if (!quoted && counts.has(char)) counts.set(char, counts.get(char)! + 1);
  }
  let best = ",";
  let bestCount = 0;
  for (const [delimiter, count] of counts) {
    if (count > bestCount) {
      best = delimiter;
      bestCount = count;
    }
  }
  return best;
}

/** Rows of cells. Handles quotes, doubled quotes, line breaks inside quotes, CRLF and a leading BOM. */
export function parseCsv(input: string): string[][] {
  const text = input.replace(/^﻿/, "");
  const delimiter = detectDelimiter(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  function endCell() {
    row.push(cell);
    cell = "";
  }
  function endRow() {
    endCell();
    rows.push(row);
    row = [];
  }

  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (quoted) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          cell += '"';
          index++;
        } else {
          quoted = false;
        }
      } else {
        cell += char;
      }
    } else if (char === '"' && cell === "") {
      quoted = true;
    } else if (char === delimiter) {
      endCell();
    } else if (char === "\n") {
      endRow();
    } else if (char === "\r") {
      if (text[index + 1] === "\n") index++;
      endRow();
    } else {
      cell += char;
    }
  }
  if (cell !== "" || row.length > 0) endRow();

  // Spreadsheets pad files with empty rows.
  return rows.filter((cells) => cells.some((value) => value.trim() !== ""));
}

/**
 * Spreadsheets run text that starts with = + - @ as a formula. Exported text is
 * prefixed with an apostrophe so it stays text; importing removes it again.
 */
const FORMULA_START = /^[=+\-@]/;

export function guardFormula(value: string): string {
  return FORMULA_START.test(value) ? `'${value}` : value;
}

export function unguardFormula(value: string): string {
  return value.startsWith("'") && FORMULA_START.test(value.slice(1)) ? value.slice(1) : value;
}

function quote(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** CSV text that Excel opens correctly in Arabic: comma separated, CRLF lines, UTF-8 with a BOM. */
export function toCsv(rows: string[][]): string {
  return `﻿${rows.map((cells) => cells.map(quote).join(",")).join("\r\n")}\r\n`;
}
