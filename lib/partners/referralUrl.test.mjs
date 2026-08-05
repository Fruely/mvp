import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  buildCanonicalReferralUrl,
  partnerReferralPath,
  resolvePublicSiteOrigin,
} from "./referralUrl.ts";

test("partnerReferralPath is global /r/{code} without locale", () => {
  assert.equal(partnerReferralPath("abc-123"), "/r/abc-123");
});

test("buildCanonicalReferralUrl avoids double slashes", () => {
  assert.equal(
    buildCanonicalReferralUrl("https://freuly.de", "abc"),
    "https://freuly.de/r/abc"
  );
  assert.equal(
    buildCanonicalReferralUrl("https://freuly.de/", "abc"),
    "https://freuly.de/r/abc"
  );
});

test("resolvePublicSiteOrigin prefers NEXT_PUBLIC_SITE_URL", () => {
  const prev = process.env.NEXT_PUBLIC_SITE_URL;
  process.env.NEXT_PUBLIC_SITE_URL = "https://freuly.de/";
  assert.equal(resolvePublicSiteOrigin(), "https://freuly.de");
  if (prev === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
  else process.env.NEXT_PUBLIC_SITE_URL = prev;
});

test("dashboard uses canonical referral path helper", () => {
  const src = readFileSync(new URL("./dashboard.ts", import.meta.url), "utf8");
  assert.match(src, /partnerReferralPath/);
  assert.doesNotMatch(src, /referral_path: `\/r\/\$\{/);
});

test("PartnerDashboardClient uses canonical URL helper for copy/share/QR", () => {
  const src = readFileSync(
    new URL("../../components/partners/PartnerDashboardClient.tsx", import.meta.url),
    "utf8"
  );
  assert.match(src, /buildCanonicalReferralUrl/);
  assert.match(src, /PartnerReferralQr/);
});

test("QR download uses freuly-referral-{code}.png filename", () => {
  const src = readFileSync(
    new URL("../../components/partners/PartnerReferralQr.tsx", import.meta.url),
    "utf8"
  );
  assert.match(src, /freuly-referral-\$\{code\}\.png/);
  assert.match(src, /QRCode\.toDataURL/);
});

test("QR failure keeps referral link section intact", () => {
  const src = readFileSync(
    new URL("../../components/partners/PartnerReferralQr.tsx", import.meta.url),
    "utf8"
  );
  assert.match(src, /setRenderFailed/);
  const dashboard = readFileSync(
    new URL("../../components/partners/PartnerDashboardClient.tsx", import.meta.url),
    "utf8"
  );
  assert.match(dashboard, /canonicalReferralUrl/);
});

test("DE/RU/UA localization keys for QR and share exist", () => {
  for (const lang of ["de", "ru", "ua"]) {
    const dict = JSON.parse(
      readFileSync(new URL(`../../locales/${lang}.json`, import.meta.url), "utf8")
    );
    assert.ok(dict.partner.dashboard.qrDownload, `${lang} qrDownload`);
    assert.ok(dict.partner.dashboard.shareText, `${lang} shareText`);
    assert.ok(dict.partner.dashboard.qrTitle, `${lang} qrTitle`);
  }
});
