import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path: string): string {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

test("matching does not look up or publish an account email", () => {
  const eligibility = read("../matching/eligibility.ts");
  const matchAfter = read("../matching/matchAfterCreate.ts");
  const payload = read("./payload.ts");
  for (const source of [eligibility, matchAfter, payload]) {
    assert.equal(source.includes("resolveClientEventEmail"), false);
    assert.equal(source.includes("getUserById"), false);
    assert.equal(source.includes("client_phone"), false);
  }
});

test("specialist notification preview keeps contact fields private", () => {
  const preview = read("../selection/preview.ts");
  assert.match(preview, /"client_email"/);
  assert.match(preview, /"client_phone"/);
});

test("conversation creation stores the owner id and not an email or phone", () => {
  const selection = read("../selection/selectSpecialist.ts");
  const start = selection.indexOf("async function ensureConversation");
  const end = selection.indexOf("export async function selectInterestedSpecialist");
  const creator = selection.slice(start, end);
  assert.match(creator, /client_user_id: input\.clientUserId/);
  assert.equal(creator.includes("client_email"), false);
  assert.equal(creator.includes("client_phone"), false);
  assert.equal(creator.includes("getUserById"), false);
});

test("account email lookup stays on the client event channel", () => {
  const delivery = read("./delivery.ts");
  assert.match(delivery, /resolveClientEventEmail/);
  assert.equal(delivery.includes('.from("service_requests")\n          .update'), false);
  assert.equal(delivery.includes("service_requests\")\n      .update"), false);
});
