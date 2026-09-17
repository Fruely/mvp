import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(
  path.join(process.cwd(), "components/home/LiveRequestDrum.tsx"),
  "utf8",
);

test("live request drum routes specialist interest into specialist onboarding", () => {
  assert.match(source, /\/become-specialist\?source=live-requests/);
  assert.match(source, /request=\$\{encodeURIComponent\(item\.id\)\}/);
});

test("live request drum presents demand as social proof, not a public contact marketplace", () => {
  assert.match(source, /Контактные данные здесь не публикуются/);
  assert.match(source, /Получать такие заявки/);
  assert.doesNotMatch(source, /client_email/);
  assert.doesNotMatch(source, /client_phone/);
  assert.doesNotMatch(source, /description/);
});
