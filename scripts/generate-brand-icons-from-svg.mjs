/**
 * Generates favicon + PWA icon PNG/ICO from canonical Favicon3 SVG.
 * Source: public/brand/freuly-symbol.svg (Favicon3_Freuly.svg)
 *
 * Run: node scripts/generate-brand-icons-from-svg.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SYMBOL_SVG = join(ROOT, "public/brand/freuly-symbol.svg");
const ICONS_DIR = join(ROOT, "public/icons");

/** Favicon3 artwork sits in the center of a wide CorelDRAW canvas (~12% band). */
const CENTER_CROP_FRACTION = 0.12;

async function loadSymbolCropSquare(size) {
  const meta = await sharp(SYMBOL_SVG).metadata();
  const baseW = meta.width ?? 1368;
  const baseH = meta.height ?? 720;
  const cropW = Math.round(baseW * CENTER_CROP_FRACTION);
  const cropH = Math.round(baseH * CENTER_CROP_FRACTION);
  const left = Math.round((baseW - cropW) / 2);
  const top = Math.round((baseH - cropH) / 2);
  const side = Math.max(cropW, cropH);
  const padLeft = left - Math.round((side - cropW) / 2);
  const padTop = top - Math.round((side - cropH) / 2);

  return sharp(SYMBOL_SVG)
    .extract({
      left: Math.max(0, padLeft),
      top: Math.max(0, padTop),
      width: Math.min(side, baseW - Math.max(0, padLeft)),
      height: Math.min(side, baseH - Math.max(0, padTop)),
    })
    .resize(size, size, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png();
}

function makeICO(pngBuffer, size) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  const dir = Buffer.alloc(16);
  dir[0] = size >= 256 ? 0 : size;
  dir[1] = size >= 256 ? 0 : size;
  dir.writeUInt16LE(1, 4);
  dir.writeUInt16LE(32, 6);
  dir.writeUInt32LE(pngBuffer.length, 8);
  dir.writeUInt32LE(22, 12);
  return Buffer.concat([header, dir, pngBuffer]);
}

async function makeMaskable512() {
  const size = 512;
  const glyphSize = Math.round(size * 0.62);
  const glyph = await loadSymbolCropSquare(glyphSize);
  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite([{ input: await glyph.toBuffer(), gravity: "centre" }])
    .png()
    .toBuffer();
}

mkdirSync(ICONS_DIR, { recursive: true });

const icon192 = await loadSymbolCropSquare(192).then((s) => s.toBuffer());
const icon512 = await loadSymbolCropSquare(512).then((s) => s.toBuffer());
const apple180 = await loadSymbolCropSquare(180).then((s) => s.toBuffer());
const favicon32 = await loadSymbolCropSquare(32).then((s) => s.toBuffer());
const maskable512 = await makeMaskable512();

writeFileSync(join(ICONS_DIR, "icon-192.png"), icon192);
writeFileSync(join(ICONS_DIR, "icon-512.png"), icon512);
writeFileSync(join(ICONS_DIR, "apple-touch-icon.png"), apple180);
writeFileSync(join(ICONS_DIR, "maskable-512.png"), maskable512);
writeFileSync(join(ROOT, "public/favicon.ico"), makeICO(favicon32, 32));

console.log("Brand icons generated from public/brand/freuly-symbol.svg");
