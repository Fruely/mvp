import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

test("Freuly tokens define approved primary teal and legacy aliases", () => {
  const tokens = readFileSync(new URL("../../styles/tokens.css", import.meta.url), "utf8");
  assert.match(tokens, /--freuly-primary:\s*#0c918b/i);
  assert.match(tokens, /--freuly-primary-hover:\s*#0e7e74/i);
  assert.match(tokens, /--freuly-bg-page:\s*#faf9f7/i);
  assert.match(tokens, /--primary:\s*#1e40af/i);
});

test("Tailwind config maps freuly theme and keeps legacy colors", () => {
  const config = readFileSync(new URL("../../tailwind.config.js", import.meta.url), "utf8");
  assert.match(config, /freuly:\s*\{/);
  assert.match(config, /primary:\s*"#1E40AF"/);
  assert.match(config, /"freuly-page-title"/);
});

test("UI primitive barrel exports core components", () => {
  const index = readFileSync(new URL("../../components/ui/index.ts", import.meta.url), "utf8");
  for (const name of ["Button", "Input", "Textarea", "Select", "Card", "Badge", "Alert"]) {
    assert.match(index, new RegExp(`export .*${name}`));
  }
});

test("Button primitive includes strong and outlinePrimary variants", () => {
  const src = readFileSync(new URL("../../components/ui/Button.tsx", import.meta.url), "utf8");
  assert.match(src, /strong:/);
  assert.match(src, /outlinePrimary:/);
  assert.match(src, /bg-freuly-text-primary text-freuly-text-on-primary/);
  assert.match(src, /border-freuly-primary bg-freuly-surface text-freuly-primary/);
});

test("UI primitives contain no routing or fetch usage", () => {
  const files = [
    "Button.tsx",
    "Input.tsx",
    "Textarea.tsx",
    "Select.tsx",
    "Card.tsx",
    "Badge.tsx",
    "Alert.tsx",
  ];
  for (const file of files) {
    const src = readFileSync(new URL(`../../components/ui/${file}`, import.meta.url), "utf8");
    assert.doesNotMatch(src, /from\s+"next\/link"/);
    assert.doesNotMatch(src, /\bfetch\s*\(/);
  }
});
