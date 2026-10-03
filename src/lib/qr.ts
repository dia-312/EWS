import { encode } from "uqr";

/** Quiet zone, in modules, around a printed code. The QR standard asks for at least 4. */
export const QR_QUIET_ZONE = 4;

/** Dark (true) and light (false) modules of the code for `text`, without the quiet zone. */
export function qrModules(text: string): boolean[][] {
  // "M" recovers up to 15% damage: a good balance for codes printed on shelf labels.
  return encode(text, { ecc: "M", border: 0 }).data;
}

/**
 * The code as an SVG string: vector, so it prints sharply at any size. Dark
 * modules of a row are merged into one rectangle to keep the file small.
 */
export function qrSvg(text: string, { quietZone = QR_QUIET_ZONE }: { quietZone?: number } = {}): string {
  const modules = qrModules(text);
  const size = modules.length + quietZone * 2;

  let path = "";
  modules.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      if (!row[x]) {
        x += 1;
        continue;
      }
      let end = x;
      while (end < row.length && row[end]) end += 1;
      path += `M${x + quietZone} ${y + quietZone}h${end - x}v1h-${end - x}z`;
      x = end;
    }
  });

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges">` +
    `<rect width="${size}" height="${size}" fill="#ffffff"/>` +
    `<path d="${path}" fill="#000000"/>` +
    `</svg>`
  );
}
