// Turns a Markdown guide into a printable PDF: pnpm docs:pdf [docs/owner-guide.ar.md]
//
// Right-to-left Arabic page, Tajawal font taken from node_modules (no network),
// A4 with page numbers. Needs the Playwright Chromium (pnpm exec playwright install chromium).
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";
import { marked } from "marked";

const input = resolve(process.argv[2] ?? "docs/owner-guide.ar.md");
const output = input.replace(/\.md$/, ".pdf");
const lang = basename(input).includes(".ar.") ? "ar" : "en";

const font = (name) => pathToFileURL(resolve(`node_modules/@fontsource/tajawal/files/${name}.woff2`)).href;

// "- [ ] text" becomes an empty box that prints well
marked.use({ gfm: true });
const body = marked
  .parse(readFileSync(input, "utf8"))
  .replace(/<input disabled="" type="checkbox">/g, '<span class="box"></span>');

const title = (/<h1[^>]*>(.*?)<\/h1>/s.exec(body)?.[1] ?? "").replace(/<[^>]+>/g, "");

const html = `<!doctype html>
<html lang="${lang}" dir="${lang === "ar" ? "rtl" : "ltr"}">
<head>
<meta charset="utf-8">
<title>${title}</title>
<style>
  @font-face { font-family: "Tajawal"; font-weight: 400; src: url("${font("tajawal-arabic-400-normal")}") format("woff2"); unicode-range: U+0600-06FF, U+0750-077F, U+FB50-FDFF, U+FE70-FEFF; }
  @font-face { font-family: "Tajawal"; font-weight: 700; src: url("${font("tajawal-arabic-700-normal")}") format("woff2"); unicode-range: U+0600-06FF, U+0750-077F, U+FB50-FDFF, U+FE70-FEFF; }
  @font-face { font-family: "Tajawal"; font-weight: 400; src: url("${font("tajawal-latin-400-normal")}") format("woff2"); unicode-range: U+0000-00FF, U+2000-206F; }
  @font-face { font-family: "Tajawal"; font-weight: 700; src: url("${font("tajawal-latin-700-normal")}") format("woff2"); unicode-range: U+0000-00FF, U+2000-206F; }
  @page { size: A4; }
  * { box-sizing: border-box; }
  body { font-family: "Tajawal", sans-serif; font-size: 11.5pt; line-height: 1.75; color: #171717; margin: 0; }
  h1 { font-size: 24pt; margin: 0 0 6pt; padding-bottom: 8pt; border-bottom: 3px solid #2563eb; }
  h2 { font-size: 15pt; margin: 22pt 0 6pt; padding-bottom: 3pt; border-bottom: 1px solid #d4d4d8; break-after: avoid; }
  h3 { font-size: 12.5pt; margin: 14pt 0 4pt; break-after: avoid; }
  p, li { orphans: 3; widows: 3; }
  ul, ol { padding-inline-start: 20pt; margin: 4pt 0; }
  li { margin: 2pt 0; }
  blockquote { margin: 8pt 0; padding: 6pt 12pt; background: #f4f6fa; border-inline-start: 4px solid #2563eb; border-radius: 4pt; }
  blockquote p { margin: 2pt 0; }
  hr { border: 0; border-top: 1px solid #e4e4e7; margin: 14pt 0; }
  a { color: #1d4ed8; text-decoration: none; }
  code { direction: ltr; unicode-bidi: embed; font-family: Consolas, "Courier New", monospace; font-size: 9.5pt; background: #f1f1f4; padding: 0 3pt; border-radius: 3pt; }
  table { width: 100%; border-collapse: collapse; margin: 8pt 0; font-size: 10.5pt; break-inside: auto; }
  th, td { border: 1px solid #d4d4d8; padding: 5pt 7pt; vertical-align: top; text-align: start; }
  th { background: #f1f5f9; }
  tr { break-inside: avoid; }
  .box { display: inline-block; width: 10pt; height: 10pt; border: 1.4px solid #52525b; border-radius: 2pt; margin-inline-end: 6pt; vertical-align: -1pt; }
  li:has(> .box) { list-style: none; margin-inline-start: -14pt; }
</style>
</head>
<body>${body}</body>
</html>`;

const dir = mkdtempSync(join(tmpdir(), "docs-pdf-"));
const page_ = join(dir, "guide.html");
writeFileSync(page_, html);

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.goto(pathToFileURL(page_).href);
  await page.evaluate(() => document.fonts.ready);
  await page.pdf({
    path: output,
    format: "A4",
    printBackground: true,
    margin: { top: "18mm", bottom: "18mm", left: "16mm", right: "16mm" },
    displayHeaderFooter: true,
    headerTemplate: "<span></span>",
    footerTemplate: `<div style="width:100%;font-size:8px;color:#71717a;text-align:center;font-family:sans-serif"><span class="pageNumber"></span> / <span class="totalPages"></span></div>`,
  });
} finally {
  await browser.close();
}
console.log(`PDF written: ${output}`);
