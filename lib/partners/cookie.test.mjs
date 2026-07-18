import assert from "node:assert/strict";
import test from "node:test";

process.env.PARTNER_REF_SECRET = "test-partner-ref-secret-for-unit-tests";

const { encodeReferralCookie, decodeReferralCookie, isReferralCookieStillValid } = await import(
  "./cookie.ts"
);

test("encode/decode roundtrip", () => {
  const issuedAt = Date.now();
  const raw = encodeReferralCookie({
    v: 1,
    linkId: "11111111-1111-1111-1111-111111111111",
    partnerId: "22222222-2222-2222-2222-222222222222",
    issuedAt,
  });
  assert.ok(raw);
  const decoded = decodeReferralCookie(raw, issuedAt + 1000);
  assert.ok(decoded);
  assert.equal(decoded.linkId, "11111111-1111-1111-1111-111111111111");
  assert.equal(decoded.partnerId, "22222222-2222-2222-2222-222222222222");
});

test("tampered cookie rejected", () => {
  const raw = encodeReferralCookie({
    v: 1,
    linkId: "11111111-1111-1111-1111-111111111111",
    partnerId: "22222222-2222-2222-2222-222222222222",
    issuedAt: Date.now(),
  });
  assert.equal(decodeReferralCookie(raw + "x"), null);
  assert.equal(decodeReferralCookie("v1.abc.def"), null);
});

test("expired cookie rejected", () => {
  const issuedAt = Date.now() - 91 * 24 * 60 * 60 * 1000;
  const raw = encodeReferralCookie({
    v: 1,
    linkId: "11111111-1111-1111-1111-111111111111",
    partnerId: "22222222-2222-2222-2222-222222222222",
    issuedAt,
  });
  assert.equal(isReferralCookieStillValid(raw), false);
});

test("first-touch: valid cookie stays valid", () => {
  const issuedAt = Date.now();
  const raw = encodeReferralCookie({
    v: 1,
    linkId: "11111111-1111-1111-1111-111111111111",
    partnerId: "22222222-2222-2222-2222-222222222222",
    issuedAt,
  });
  assert.equal(isReferralCookieStillValid(raw, issuedAt + 1000), true);
});
