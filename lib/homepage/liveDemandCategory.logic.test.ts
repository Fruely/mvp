import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(
  path.join(process.cwd(), "lib/homepage/liveDemandCategory.ts"),
  "utf8",
);

test("public live demand category label stays a safe display field", () => {
  assert.match(source, /getCategoryTitle/);
  assert.match(source, /CATEGORY_TEXT_MAX = 48/);
  assert.doesNotMatch(source, /client_email/);
  assert.doesNotMatch(source, /client_phone/);
  assert.doesNotMatch(source, /description/);
});
