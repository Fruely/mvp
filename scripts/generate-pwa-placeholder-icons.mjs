/**
 * Generates TEMPORARY placeholder PWA icons (brand background + white "F").
 * Dependency-free: hand-rolled PNG encoder via node:zlib. No external libs.
 *
 * These are NOT final brand assets. Replace before a public production release:
 *   public/favicon.ico
 *   public/icons/icon-192.png
 *   public/icons/icon-512.png
 *   public/icons/maskable-512.png   (glyph kept inside maskable safe zone)
 *   public/icons/apple-touch-icon.png
 *
 * Run: node scripts/generate-pwa-placeholder-icons.mjs
 */
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BRAND = [0x4b, 0x50, 0xe6]; // #4B50E6
const WHITE = [0xff, 0xff, 0xff];

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePNG(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function makeIconRGBA(size, glyphScale) {
  const rgba = Buffer.alloc(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    rgba[i * 4] = BRAND[0];
    rgba[i * 4 + 1] = BRAND[1];
    rgba[i * 4 + 2] = BRAND[2];
    rgba[i * 4 + 3] = 255;
  }
  const bw = size * glyphScale;
  const bh = size * glyphScale;
  const gx = (size - bw) / 2;
  const gy = (size - bh) / 2;

  const rects = [
    [0, 0, 0.24 * bw, bh], // vertical stem
    [0, 0, bw, 0.24 * bh], // top bar
    [0, 0.4 * bh, 0.68 * bw, 0.2 * bh], // middle bar
  ];

  const paint = (x0, y0, w, h) => {
    const xa = Math.round(gx + x0);
    const ya = Math.round(gy + y0);
    const xb = Math.round(gx + x0 + w);
    const yb = Math.round(gy + y0 + h);
    for (let y = ya; y < yb; y++) {
      for (let x = xa; x < xb; x++) {
        if (x < 0 || y < 0 || x >= size || y >= size) continue;
        const idx = (y * size + x) * 4;
        rgba[idx] = WHITE[0];
        rgba[idx + 1] = WHITE[1];
        rgba[idx + 2] = WHITE[2];
        rgba[idx + 3] = 255;
      }
    }
  };
  for (const [x, y, w, h] of rects) paint(x, y, w, h);
  return rgba;
}

function makePNG(size, glyphScale) {
  return encodePNG(size, size, makeIconRGBA(size, glyphScale));
}

function makeICO(png, size) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(1, 4); // count
  const dir = Buffer.alloc(16);
  dir[0] = size >= 256 ? 0 : size;
  dir[1] = size >= 256 ? 0 : size;
  dir[2] = 0;
  dir[3] = 0;
  dir.writeUInt16LE(1, 4); // planes
  dir.writeUInt16LE(32, 6); // bpp
  dir.writeUInt32LE(png.length, 8);
  dir.writeUInt32LE(22, 12); // offset = 6 + 16
  return Buffer.concat([header, dir, png]);
}

mkdirSync(join(ROOT, "public/icons"), { recursive: true });

writeFileSync(join(ROOT, "public/icons/icon-192.png"), makePNG(192, 0.62));
writeFileSync(join(ROOT, "public/icons/icon-512.png"), makePNG(512, 0.62));
// Maskable: keep glyph inside the ~80% safe zone.
writeFileSync(join(ROOT, "public/icons/maskable-512.png"), makePNG(512, 0.5));
writeFileSync(join(ROOT, "public/icons/apple-touch-icon.png"), makePNG(180, 0.62));
writeFileSync(join(ROOT, "public/favicon.ico"), makeICO(makePNG(32, 0.62), 32));

console.log("Placeholder PWA icons generated in public/ and public/icons/");
