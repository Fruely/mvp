import assert from "node:assert/strict";
import test from "node:test";
import {
  isValidHttpUrl,
  normalizeExtraLinks,
  validateApplicationInput,
} from "./applicationValidation.ts";

test("isValidHttpUrl accepts https only host urls", () => {
  assert.equal(isValidHttpUrl("https://t.me/channel"), true);
  assert.equal(isValidHttpUrl("http://example.com/x"), true);
  assert.equal(isValidHttpUrl("javascript:alert(1)"), false);
  assert.equal(isValidHttpUrl("ftp://x.com"), false);
  assert.equal(isValidHttpUrl("not-a-url"), false);
});

test("normalizeExtraLinks filters invalid and caps", () => {
  const links = normalizeExtraLinks(
    "https://a.com\nbad\nhttps://b.com,https://c.com\nhttps://d.com\nhttps://e.com\nhttps://f.com"
  );
  assert.equal(links.length, 5);
  assert.ok(links.every((u) => u.startsWith("http")));
});

test("validateApplicationInput requires privacy and valid channel url", () => {
  const bad = validateApplicationInput({
    name: "Anna",
    email: "anna@example.com",
    channel_name: "Channel",
    channel_url: "notaurl",
    privacy_accepted: true,
  });
  assert.equal(bad.ok, false);

  const noPrivacy = validateApplicationInput({
    name: "Anna",
    email: "anna@example.com",
    channel_name: "Channel",
    channel_url: "https://youtube.com/@x",
    privacy_accepted: false,
  });
  assert.equal(noPrivacy.ok, false);

  const ok = validateApplicationInput({
    name: "Anna",
    email: "Anna@Example.com",
    channel_name: "Channel",
    channel_url: "https://youtube.com/@x",
    privacy_accepted: true,
  });
  assert.equal(ok.ok, true);
  if (ok.ok) assert.equal(ok.value.email, "anna@example.com");
});
