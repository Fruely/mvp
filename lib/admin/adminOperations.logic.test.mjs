import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  ADMIN_NAV_ITEMS,
  ADMIN_PARTNER_STATUS_LABELS,
} from "./adminCopy.ts";
import {
  buildAdminReferralUrl,
  formatPartnerStatusRu,
  suggestReferralCodeFromEmail,
} from "./partnerAdminUi.ts";
import { buildCanonicalReferralUrl, partnerReferralPath } from "../partners/referralUrl.ts";

const layoutSrc = readFileSync(
  new URL("../../app/admin/(protected)/layout.tsx", import.meta.url),
  "utf8",
);
const partnersPageSrc = readFileSync(
  new URL("../../app/admin/(protected)/partners/page.tsx", import.meta.url),
  "utf8",
);
const helpPageSrc = readFileSync(
  new URL("../../app/admin/(protected)/help/page.tsx", import.meta.url),
  "utf8",
);
const serviceSrc = readFileSync(
  new URL("../partners/service.ts", import.meta.url),
  "utf8",
);
const guideDocSrc = readFileSync(
  new URL("../../docs/admin/PARTNER_PROGRAM_GUIDE_RU.md", import.meta.url),
  "utf8",
);

test("admin nav has single campaign links entry in Russian", () => {
  const campaignItems = ADMIN_NAV_ITEMS.filter((item) => item.href === "/admin/campaign-links");
  assert.equal(campaignItems.length, 1);
  assert.equal(campaignItems[0]?.label, "Рекламные ссылки");
  assert.doesNotMatch(layoutSrc, /Campaign links/i);
  assert.doesNotMatch(layoutSrc, /Campaign Links/);
});

test("admin nav includes help and partners in Russian", () => {
  assert.ok(ADMIN_NAV_ITEMS.some((item) => item.href === "/admin/help" && item.label === "Инструкция"));
  assert.ok(ADMIN_NAV_ITEMS.some((item) => item.href === "/admin/partners" && item.label === "Партнёры"));
});

test("referral URL builder produces canonical /r/ path", () => {
  assert.equal(partnerReferralPath("partner-abc"), "/r/partner-abc");
  assert.equal(
    buildCanonicalReferralUrl("https://freuly.de", "partner-abc"),
    "https://freuly.de/r/partner-abc",
  );
  const url = buildAdminReferralUrl("partner-abc");
  assert.match(url, /\/r\/partner-abc$/);
});

test("partner lifecycle service logic unchanged", () => {
  assert.match(serviceSrc, /setPartnerStatus/);
  assert.match(serviceSrc, /is_active: status === "active"/);
  assert.match(partnersPageSrc, /setStatus\(p\.id, "active"\)/);
  assert.match(partnersPageSrc, /setStatus\(p\.id, "paused"\)/);
  assert.match(partnersPageSrc, /setStatus\(p\.id, "disabled"\)/);
});

test("suggestReferralCodeFromEmail returns valid normalized code", () => {
  const code = suggestReferralCodeFromEmail("Ivan.Petrov@example.com");
  assert.match(code, /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/);
  assert.ok(code.includes("ivan") || code.startsWith("p-"));
});

test("partner status labels map to Russian", () => {
  assert.equal(formatPartnerStatusRu("active"), ADMIN_PARTNER_STATUS_LABELS.active);
  assert.equal(formatPartnerStatusRu("paused"), "Приостановлен");
});

test("/admin/partners page shows full referral URL actions", () => {
  assert.match(partnersPageSrc, /AdminReferralLinkActions/);
  assert.match(partnersPageSrc, /buildAdminReferralUrl/);
  assert.match(partnersPageSrc, /\/admin\/help/);
});

test("/admin/help route exists with partner guide content", () => {
  assert.match(helpPageSrc, /AdminPartnerGuideContent/);
  assert.match(guideDocSrc, /Три типа ссылок Freuly/);
  assert.match(guideDocSrc, /https:\/\/freuly\.de\/r\//);
  assert.match(guideDocSrc, /https:\/\/freuly\.de\/go\//);
});

test("admin protected layout keeps server-side token gate", () => {
  assert.match(layoutSrc, /ADMIN_TOKEN_COOKIE/);
  assert.match(layoutSrc, /redirect\("\/admin\/login"\)/);
});
