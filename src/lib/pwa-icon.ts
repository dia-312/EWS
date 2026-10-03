import { deflateSync } from "node:zlib";

/** The icons the app manifest and the phone's home screen ask for. */
export const PWA_ICONS = {
  "192": { size: 192, maskable: false },
  "512": { size: 512, maskable: false },
  "maskable-512": { size: 512, maskable: true },
  "apple-180": { size: 180, maskable: false },
} as const;

export type PwaIconName = keyof typeof PWA_ICONS;

export function isPwaIconName(value: string): value is PwaIconName {
  return Object.hasOwn(PWA_ICONS, value);
}

function parseHex(hex: string): [number, number, number] {
  const value = hex.replace("#", "");
  return [0, 2, 4].map((start) => parseInt(value.slice(start, start + 2), 16)) as [number, number, number];
}

// ---- the picture: a shopping bag, in unit coordinates (0..1), centered
const BAG = { left: 0.25, right: 0.75, top: 0.4, bottom: 0.78, corner: 0.05 };
const HANDLE = { cx: 0.5, cy: 0.4, outer: 0.15, inner: 0.1 };

function insideBag(x: number, y: number): boolean {
  const { left, right, top, bottom, corner } = BAG;
  if (x < left || x > right || y < top || y > bottom) return false;
  const dx = Math.max(left + corner - x, 0, x - (right - corner));
  const dy = Math.max(top + corner - y, 0, y - (bottom - corner));
  return dx * dx + dy * dy <= corner * corner;
}

function insideHandle(x: number, y: number): boolean {
  if (y > HANDLE.cy) return false;
  const distance = Math.hypot(x - HANDLE.cx, y - HANDLE.cy);
  return distance <= HANDLE.outer && distance >= HANDLE.inner;
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

/**
 * A square PNG: the store's primary color with a white-ish bag on it. Made in
 * code so every store gets an icon in its own color without uploading anything.
 * Maskable icons keep the picture inside the central 60% so phones can crop them.
 */
export function renderIconPng(size: number, background: string, foreground: string, maskable: boolean): Buffer {
  const scale = maskable ? 0.6 : 0.78;
  const [br, bg, bb] = parseHex(background);
  const [fr, fg, fb] = parseHex(foreground);
  const samples = 3;

  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let py = 0; py < size; py++) {
    const rowStart = py * (size * 3 + 1);
    raw[rowStart] = 0; // filter: none
    for (let px = 0; px < size; px++) {
      let covered = 0;
      for (let sy = 0; sy < samples; sy++) {
        for (let sx = 0; sx < samples; sx++) {
          const x = (px + (sx + 0.5) / samples) / size;
          const y = (py + (sy + 0.5) / samples) / size;
          // zoom the picture around the center by `scale`
          const u = (x - 0.5) / scale + 0.5;
          const v = (y - 0.5) / scale + 0.5;
          if (insideBag(u, v) || insideHandle(u, v)) covered++;
        }
      }
      const share = covered / (samples * samples);
      const at = rowStart + 1 + px * 3;
      raw[at] = Math.round(br + (fr - br) * share);
      raw[at + 1] = Math.round(bg + (fg - bg) * share);
      raw[at + 2] = Math.round(bb + (fb - bb) * share);
    }
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 2; // RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
