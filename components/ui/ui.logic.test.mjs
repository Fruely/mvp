import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

test("Freuly tokens define live Figma dashboard values and legacy aliases", () => {
  const tokens = readFileSync(new URL("../../styles/tokens.css", import.meta.url), "utf8");
  assert.match(tokens, /--freuly-primary:\s*#107b80/i);
  assert.match(tokens, /--freuly-text-primary:\s*#1e1e1e/i);
  assert.match(tokens, /--freuly-text-secondary:\s*#6b6b6b/i);
  assert.match(tokens, /--freuly-bg-page:\s*#f8f7f5/i);
  assert.match(tokens, /--freuly-bg-dashboard:\s*#f8f7f5/i);
  assert.match(tokens, /--freuly-border-default:\s*#e6e4df/i);
  assert.match(tokens, /--freuly-success:\s*#15803d/i);
  assert.match(tokens, /--freuly-success-light:\s*#f0fdf4/i);
  assert.match(tokens, /--freuly-success-border:\s*#bbf7d0/i);
  assert.match(tokens, /--freuly-warning:\s*#b45309/i);
  assert.match(tokens, /--freuly-warning-light:\s*#fff7ed/i);
  assert.match(tokens, /--freuly-warning-border:\s*#fed7aa/i);
  assert.match(tokens, /--freuly-radius-button:\s*6px/i);
  assert.match(tokens, /--freuly-radius-card:\s*10px/i);
  assert.match(tokens, /--freuly-text-card-title:\s*20px/i);
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
  assert.match(src, /rounded-freuly-button/);
  assert.match(src, /min-h-\[37px\]/);
  assert.match(src, /text-freuly-text-secondary/);
});

test("Card and Badge match live Figma geometry", () => {
  const card = readFileSync(new URL("../../components/ui/Card.tsx", import.meta.url), "utf8");
  assert.match(card, /rounded-freuly-card/);
  assert.match(card, /padding = "lg"/);
  assert.doesNotMatch(card, /shadow-sm/);

  const badge = readFileSync(new URL("../../components/ui/Badge.tsx", import.meta.url), "utf8");
  assert.match(badge, /rounded-freuly-pill/);
  assert.match(badge, /border-freuly-success-border/);
  assert.match(badge, /border-freuly-warning-border/);
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
