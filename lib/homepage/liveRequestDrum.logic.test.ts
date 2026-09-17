import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(
  path.join(process.cwd(), "components/home/LiveRequestDrum.tsx"),
  "utf8",
);

test("live request drum uses the existing public promotion path, not a parallel marketplace", () => {
  assert.match(source, /requestPromotionPath/);
  assert.match(source, /cardLinkLang/);
  assert.match(source, /become-specialist/);
  assert.match(source, /\/login\?next=/);
  assert.doesNotMatch(source, /request=\$\{encodeURIComponent/);
  assert.doesNotMatch(source, /client_email/);
  assert.doesNotMatch(source, /client_phone/);
  assert.doesNotMatch(source, /\bdescription\b/);
});

test("live request drum stays an editorial cylindrical stack without orbit chrome", () => {
  assert.match(source, /drumSlotStyle/);
  assert.match(source, /drumCardTransform/);
  assert.match(source, /prefers-reduced-motion/);
  assert.match(source, /bg-\[#f8f7f5\]/);
  assert.doesNotMatch(source, /orbit/i);
  assert.doesNotMatch(source, /ellipse/i);
  assert.doesNotMatch(source, /bg-\[#0D2B2A\]/);
  assert.doesNotMatch(source, /rounded-\[28px\] border border-white\/80 bg-white\/70/);
});

test("approved editorial hero copy is localized", () => {
  const ru = JSON.parse(fs.readFileSync(path.join(process.cwd(), "locales/ru.json"), "utf8"));
  const ua = JSON.parse(fs.readFileSync(path.join(process.cwd(), "locales/ua.json"), "utf8"));
  const de = JSON.parse(fs.readFileSync(path.join(process.cwd(), "locales/de.json"), "utf8"));
  assert.equal(ru["home.variantC.hero.title"], "Какая услуга вам нужна?");
  assert.equal(ru["home.variantC.hero.requestCta"], "Оставить заявку");
  assert.equal(ru["home.variantC.liveDemand.sectionTitle"], "Живые запросы клиентов Freuly");
  assert.equal(ru["home.variantC.liveDemand.warning"], "Только для зарегистрированных специалистов");
  assert.ok(ua["home.variantC.liveDemand.sectionTitle"]);
  assert.ok(de["home.variantC.liveDemand.sectionTitle"]);
  assert.doesNotMatch(de["home.variantC.hero.title"], /[А-Яа-яЁё]/);
});

test("empty live demand feed hides the homepage section", () => {
  assert.match(source, /if \(items\.length === 0\) return null/);
});

test("live demand copy comes from locale keys for all visitors and specialists", () => {
  assert.match(source, /home\.variantC\.liveDemand\.sectionTitle/);
  assert.match(source, /home\.variantC\.liveDemand\.warning/);
  assert.match(source, /item\.summary/);
  assert.match(source, /item\.category/);
});
