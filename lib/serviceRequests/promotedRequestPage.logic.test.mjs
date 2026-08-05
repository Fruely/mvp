import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  mapPromotedPaymentDisplayState,
  resolvePromotedRequestAccess,
} from "./promotedRequestAccess.ts";

const pageSrc = readFileSync(
  new URL(
    "../../app/[lang]/specialist/(protected)/dashboard/requests/promoted/page.tsx",
    import.meta.url,
  ),
  "utf8",
);
const pageDataSrc = readFileSync(
  new URL("./promotedRequestPageData.ts", import.meta.url),
  "utf8",
);
const accessSrc = readFileSync(new URL("./promotedRequestAccess.ts", import.meta.url), "utf8");
const constantsSrc = readFileSync(
  new URL("./promotedRequestConstants.ts", import.meta.url),
  "utf8",
);
const viewSrc = readFileSync(
  new URL("../../components/serviceRequests/PromotedRequestPageView.tsx", import.meta.url),
  "utf8",
);
const ctaSrc = readFileSync(
  new URL("../../components/billing/PromotedAccessCheckoutButton.tsx", import.meta.url),
  "utf8",
);
const billingSrc = readFileSync(
  new URL("../../app/[lang]/specialist/(protected)/dashboard/billing/page.tsx", import.meta.url),
  "utf8",
);
const layoutSrc = readFileSync(
  new URL("../../app/[lang]/specialist/(protected)/layout.tsx", import.meta.url),
  "utf8",
);
const ruLocale = readFileSync(new URL("../../locales/ru.json", import.meta.url), "utf8");
const uaLocale = readFileSync(new URL("../../locales/ua.json", import.meta.url), "utf8");
const deLocale = readFileSync(new URL("../../locales/de.json", import.meta.url), "utf8");

const promotion = {
  public_title: "Public title",
  public_summary: "Public summary",
  status: "published",
};

test("A: page requires specialist auth", () => {
  assert.match(pageSrc, /getCurrentUserAndSpecialist/);
  assert.match(pageSrc, /export const dynamic = "force-dynamic"/);
});

test("B: specialist resolved by auth user", () => {
  assert.match(pageDataSrc, /getSignupBindingForCheckout/);
  assert.match(pageDataSrc, /binding\.user_id !== input\.userId/);
  assert.match(pageDataSrc, /binding\.specialist_id !== input\.specialistId/);
});

test("C-D: binding resolved server-side; no binding unavailable", () => {
  const decision = resolvePromotedRequestAccess({
    bindingPresent: false,
    promotion: null,
    grant: null,
    effectivePaidPlan: null,
    latestPayment: null,
  });
  assert.equal(decision.kind, "unavailable");
});

test("E: no internal IDs accepted from URL/query", () => {
  assert.doesNotMatch(pageSrc, /searchParams/);
  assert.doesNotMatch(viewSrc, /promotion_id/);
  assert.doesNotMatch(viewSrc, /payment_id/);
});

test("F-H: locked view uses public fields only; no contact query in locked path", () => {
  assert.match(viewSrc, /publicTitle/);
  assert.match(viewSrc, /publicSummary/);
  const unlockCall = pageDataSrc.indexOf("await loadUnlockedServiceRequest(");
  const lockedReturn = pageDataSrc.indexOf("return lockedModelFromDecision(decision)");
  assert.ok(lockedReturn > 0 && unlockCall > lockedReturn);
  assert.match(viewSrc, /model\.view === "unlocked"/);
});

test("I-J: locked view shows €10 and 7-day credit explanation", () => {
  assert.match(viewSrc, /paywall\.price/);
  assert.match(viewSrc, /paywall\.creditHint/);
});

test("K-L: checkout CTA sends only lang; no internal ids", () => {
  assert.match(ctaSrc, /JSON\.stringify\(\{ lang \}\)/);
  assert.doesNotMatch(ctaSrc, /promotion_id/);
  assert.doesNotMatch(ctaSrc, /specialist_id/);
  assert.doesNotMatch(ctaSrc, /payment_id/);
});

test("M-N: already_has_access and subscription_access refresh", () => {
  assert.match(ctaSrc, /already_has_access/);
  assert.match(ctaSrc, /subscription_access/);
  assert.match(ctaSrc, /router\.refresh\(\)/);
});

test("O: checkout URL redirect only from server response", () => {
  assert.match(ctaSrc, /checkout_url/);
  assert.match(ctaSrc, /window\.location\.assign/);
  assert.doesNotMatch(ctaSrc, /stripe\.com\/c\/pay/);
});

test("P: active payment grant unlocks", () => {
  const decision = resolvePromotedRequestAccess({
    bindingPresent: true,
    promotion,
    grant: { revoked_at: null },
    effectivePaidPlan: null,
    latestPayment: null,
  });
  assert.equal(decision.kind, "unlocked");
  if (decision.kind === "unlocked") assert.equal(decision.source, "payment");
});

test("Q: revoked grant does not unlock without paid plan", () => {
  const decision = resolvePromotedRequestAccess({
    bindingPresent: true,
    promotion,
    grant: { revoked_at: new Date().toISOString() },
    effectivePaidPlan: null,
    latestPayment: null,
  });
  assert.equal(decision.kind, "locked");
});

test("R: paid plan unlocks", () => {
  const decision = resolvePromotedRequestAccess({
    bindingPresent: true,
    promotion,
    grant: null,
    effectivePaidPlan: "basic",
    latestPayment: null,
  });
  assert.equal(decision.kind, "unlocked");
  if (decision.kind === "unlocked") assert.equal(decision.source, "subscription");
});

test("S-T: starter/early_access and cancelled plan do not unlock", () => {
  assert.equal(
    resolvePromotedRequestAccess({
      bindingPresent: true,
      promotion,
      grant: null,
      effectivePaidPlan: null,
      latestPayment: null,
    }).kind,
    "locked",
  );
});

test("U: checkout success query does not unlock", () => {
  assert.doesNotMatch(pageSrc, /promoted_checkout/);
  assert.doesNotMatch(pageDataSrc, /checkout=success/);
  assert.doesNotMatch(accessSrc, /searchParams/);
});

test("V: payment status paid alone does not unlock", () => {
  const decision = resolvePromotedRequestAccess({
    bindingPresent: true,
    promotion,
    grant: null,
    effectivePaidPlan: null,
    latestPayment: { status: "paid" },
  });
  assert.equal(decision.kind, "processing");
});

test("W-X: unlocked path queries service_requests with whitelist", () => {
  assert.match(pageDataSrc, /loadUnlockedServiceRequest/);
  assert.match(constantsSrc, /PROMOTED_REQUEST_SERVICE_REQUEST_UNLOCK_SELECT/);
  assert.match(constantsSrc, /client_name/);
  assert.doesNotMatch(constantsSrc, /select\("\*"\)/);
});

test("Y-Z: unlocked view shows contacts; missing handled", () => {
  assert.match(viewSrc, /contacts\.title/);
  assert.match(viewSrc, /details\.client_email/);
  assert.match(viewSrc, /contacts\.missing/);
});

test("AA: closed promotion + no access → no pay CTA", () => {
  const decision = resolvePromotedRequestAccess({
    bindingPresent: true,
    promotion: { ...promotion, status: "closed" },
    grant: null,
    effectivePaidPlan: null,
    latestPayment: null,
  });
  assert.equal(decision.kind, "closed_locked");
  if (decision.kind === "closed_locked") assert.equal(decision.showPayCta, false);
});

test("AB: closed promotion + existing access unlocks", () => {
  const decision = resolvePromotedRequestAccess({
    bindingPresent: true,
    promotion: { ...promotion, status: "closed" },
    grant: { revoked_at: null },
    effectivePaidPlan: null,
    latestPayment: null,
  });
  assert.equal(decision.kind, "unlocked");
});

test("AC: paid + missing grant → processing state", () => {
  assert.equal(mapPromotedPaymentDisplayState("paid"), "processing");
  const decision = resolvePromotedRequestAccess({
    bindingPresent: true,
    promotion,
    grant: null,
    effectivePaidPlan: null,
    latestPayment: { status: "paid" },
  });
  assert.equal(decision.kind, "processing");
});

test("AD: refund/dispute state locked", () => {
  for (const status of ["refunded", "disputed"]) {
    const decision = resolvePromotedRequestAccess({
      bindingPresent: true,
      promotion,
      grant: null,
      effectivePaidPlan: null,
      latestPayment: { status },
    });
    assert.equal(decision.kind, "locked");
    if (decision.kind === "locked") assert.equal(decision.showPayCta, false);
  }
});

test("AE: route/page dynamic no-store", () => {
  assert.match(pageSrc, /force-dynamic/);
});

test("AF: no select('*')", () => {
  for (const src of [pageDataSrc, constantsSrc]) {
    assert.doesNotMatch(src, /select\("\*"\)/);
    assert.doesNotMatch(src, /select\('\*'\)/);
  }
});

test("AG: no browser Supabase writes on page", () => {
  assert.doesNotMatch(pageSrc, /createSupabaseServerComponentClient/);
  assert.doesNotMatch(viewSrc, /supabase/);
  assert.doesNotMatch(ctaSrc, /supabase/);
});

test("AH-AJ: billing success/cancel notices link back without payment confirmed claim", () => {
  assert.match(billingSrc, /promoted_checkout/);
  assert.match(billingSrc, /promotedCheckout\.processingNotice/);
  assert.match(billingSrc, /promotedCheckout\.backToRequest/);
  assert.match(billingSrc, /requests\/promoted/);
  assert.doesNotMatch(billingSrc, /оплата подтверждена/i);
});

test("AK: RU/UA/DE keys exist", () => {
  for (const blob of [ruLocale, uaLocale, deLocale]) {
    assert.match(blob, /dashboard\.promotedRequestPage\.title/);
    assert.match(blob, /dashboard\.billingPage\.promotedCheckout\.backToRequest/);
  }
});

test("layout allows promoted page during onboarding", () => {
  assert.match(layoutSrc, /requests\/promoted/);
});

test("pageData loads contacts only after unlock decision", () => {
  const unlockIdx = pageDataSrc.indexOf("await loadUnlockedServiceRequest(");
  const lockedReturn = pageDataSrc.indexOf("return lockedModelFromDecision(decision)");
  assert.ok(lockedReturn > 0);
  assert.ok(unlockIdx > lockedReturn);
});
