import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(
  path.join(process.cwd(), "components/home/LiveRequestDrum.tsx"),
  "utf8",
);

test("live request drum stays a social-proof surface, not an open marketplace", () => {
  assert.match(source, /<article/);
  assert.doesNotMatch(source, /become-specialist/);
  assert.doesNotMatch(source, /request=\$\{encodeURIComponent/);
});

test("live request drum presents demand as social proof, not a public contact marketplace", () => {
  assert.match(source, /без имён и контактных данных/);
  assert.match(source, /item\.summary/);
  assert.doesNotMatch(source, /client_email/);
  assert.doesNotMatch(source, /client_phone/);
  assert.doesNotMatch(source, /description/);
});
