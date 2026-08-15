/**
 * Crops committed Freuly brand PNGs by removing near-white padding and
 * converting the background to transparency. Does not alter logo artwork.
 *
 * Run: node scripts/crop-freuly-brand-logos.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const WHITE_THRESHOLD = 250;

function isBackground(r, g, b, a) {
  if (a < 10) return true;
  return r >= WHITE_THRESHOLD && g >= WHITE_THRESHOLD && b >= WHITE_THRESHOLD;
}

function contentBounds(png) {
  const { width, height, data } = png;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (width * y + x) << 2;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      if (!isBackground(r, g, b, a)) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  return { minX, minY, maxX, maxY, width, height };
}

function cropToTransparent(png, bounds, pad = 4) {
  const { minX, minY, maxX, maxY, width, height } = bounds;
  const left = Math.max(0, minX - pad);
  const top = Math.max(0, minY - pad);
  const right = Math.min(width - 1, maxX + pad);
  const bottom = Math.min(height - 1, maxY + pad);
  const cw = right - left + 1;
  const ch = bottom - top + 1;
  const cropped = new PNG({ width: cw, height: ch });

  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const src = ((top + y) * width + (left + x)) << 2;
      const dst = (y * cw + x) << 2;
      const r = png.data[src];
      const g = png.data[src + 1];
      const b = png.data[src + 2];
      const a = png.data[src + 3];
      if (isBackground(r, g, b, a)) {
        cropped.data[dst] = 0;
        cropped.data[dst + 1] = 0;
        cropped.data[dst + 2] = 0;
        cropped.data[dst + 3] = 0;
      } else {
        cropped.data[dst] = r;
        cropped.data[dst + 1] = g;
        cropped.data[dst + 2] = b;
        cropped.data[dst + 3] = a;
      }
    }
  }

  return cropped;
}

function process(inputRel, outputRel) {
  const inputPath = join(ROOT, inputRel);
  const outputPath = join(ROOT, outputRel);
  const png = PNG.sync.read(readFileSync(inputPath));
  const bounds = contentBounds(png);
  const cropped = cropToTransparent(png, bounds);
  writeFileSync(outputPath, PNG.sync.write(cropped));
  console.log(`${inputRel} -> ${outputRel}: ${cropped.width}x${cropped.height}`);
  return { width: cropped.width, height: cropped.height };
}

const full = process(
  "public/brand/freuly-full-logo.png",
  "public/brand/freuly-full-logo-cropped.png",
);
process(
  "public/brand/freuly-symbol-source.png",
  "public/brand/freuly-symbol-cropped.png",
);

console.log(`full logo cropped dimensions: ${full.width}x${full.height}`);
