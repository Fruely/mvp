import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const entrySource = fs.readFileSync(
  path.join(root, "components/serviceRequests/ClientDemandEntry.tsx"),
  "utf8",
);
const requestPageSource = fs.readFileSync(
  path.join(root, "app/[lang]/request/page.tsx"),
  "utf8",
);
const langLayoutSource = fs.readFileSync(
  path.join(root, "app/[lang]/layout.tsx"),
  "utf8",
);
const homeSource = fs.readFileSync(
  path.join(root, "app/[lang]/HomeClient.tsx"),
  "utf8",
);
const createRouteSource = fs.readFileSync(
  path.join(root, "app/api/service-requests/route.ts"),
  "utf8",
);
const marketingLinksSource = fs.readFileSync(
  path.join(root, "app/admin/(protected)/marketing-links/page.tsx"),
  "utf8",
);
const shortLinkRouteSource = fs.readFileSync(
  path.join(root, "app/go/muesli/route.ts"),
  "utf8",
);
const shortLinksSource = fs.readFileSync(
  path.join(root, "lib/serviceRequests/paidRequestShortLinks.ts"),
  "utf8",
);
const publicFeedSource = fs.readFileSync(
  path.join(root, "app/api/public/recent-service-requests/route.ts"),
  "utf8",
);

test("ad request entry submits into the existing service request pipeline", () => {
  assert.match(entrySource, /fetch\("\/api\/service-requests"/);
  assert.match(entrySource, /source_path:\s*`\/\$\{lang\}\/request`/);
  assert.match(entrySource, /preferred_language:\s*preferredLanguage/);
  assert.match(entrySource, /work_format:\s*workFormat/);
  assert.match(entrySource, /idempotency_key:\s*idempotencyKey\.current/);
});

test("request entry is a dedicated page, not a redirect to the old full form", () => {
  assert.match(requestPageSource, /ClientDemandEntry/);
  assert.doesNotMatch(requestPageSource, /request-service/);
  assert.match(requestPageSource, /index:\s*false/);
  assert.doesNotMatch(requestPageSource, /redirect\(/);
  assert.doesNotMatch(requestPageSource, /HomeClient|LiveRequestDrum/);
});

test("RU/UA/DE paid request landing opens the first form step copy", () => {
  assert.match(entrySource, /useState\(1\)/);
  assert.match(entrySource, /title: "Найдём специалиста в Германии, который говорит на вашем языке"/);
  assert.match(entrySource, /title: "Знайдемо спеціаліста в Німеччині, який говорить вашою мовою"/);
  assert.match(entrySource, /title: "Wir finden eine passende Fachkraft in Deutschland, die Ihre Sprache spricht"/);
  assert.match(entrySource, /taskLabel: "Какая услуга вам нужна\?"/);
  assert.match(entrySource, /taskLabel: "Яка послуга вам потрібна\?"/);
  assert.match(entrySource, /taskLabel: "Welche Leistung brauchen Sie\?"/);
  assert.match(entrySource, /Без регистрации/);
  assert.match(entrySource, /Без реєстрації/);
  assert.match(entrySource, /Ohne Anmeldung/);
  assert.match(entrySource, /\{step === 1 \?/);
  assert.match(entrySource, /\{copy\.continue\}/);
});

test("paid request landing strips homepage chrome and avoids horizontal overflow", () => {
  assert.match(langLayoutSource, /pathname === `\/\$\{lang\}\/request`/);
  assert.match(langLayoutSource, /overflow-x-hidden bg-freuly-page/);
  assert.doesNotMatch(
    langLayoutSource.slice(
      langLayoutSource.indexOf("pathname === `/${lang}/request`"),
      langLayoutSource.indexOf("pathname === `/${lang}/request`") + 250,
    ),
    /<Header|<Footer|<LanguageBar/,
  );
  assert.match(requestPageSource, /overflow-x-hidden/);
  assert.match(entrySource, /overflow-x-hidden/);
  assert.doesNotMatch(entrySource, /specialist search|LiveRequestDrum|home\.variantC/);
});

test("homepage request CTA still uses the same /{lang}/request entry", () => {
  assert.match(homeSource, /href=\{`\/\$\{lang\}\/request`\}/);
  assert.match(homeSource, /home\.variantC\.hero\.requestCta/);
});

test("client can submit without signing in and keeps preferred language separate from UI locale", () => {
  assert.doesNotMatch(entrySource, /supabase\.auth|signIn|getSession|requireAuth/);
  assert.doesNotMatch(requestPageSource, /createSupabaseServerClient|getSession|redirect\("\/login/);
  assert.match(createRouteSource, /auth\.kind === "authenticated" \? auth\.userId : null/);
  assert.match(entrySource, /preferred_language:\s*preferredLanguage/);
  assert.match(entrySource, /locale:\s*lang/);
  assert.match(entrySource, /useState<Lang>\(lang\)/);
});

test("UTM snapshot is captured on landing and sent through every step until insert", () => {
  assert.match(entrySource, /buildAcquisitionFirstTouch/);
  assert.match(entrySource, /window\.location\.href/);
  assert.match(entrySource, /acquisition:\s*acquisitionRef\.current/);
  assert.match(createRouteSource, /pickAcquisitionForServiceRequest/);
  assert.match(createRouteSource, /\.from\("service_requests"\)/);
  assert.match(createRouteSource, /acquisition_source:\s*acquisition\?\.source/);
  assert.match(createRouteSource, /acquisition_medium:\s*acquisition\?\.medium/);
  assert.match(createRouteSource, /acquisition_campaign:\s*acquisition\?\.campaign/);
  assert.match(createRouteSource, /acquisition_content:\s*acquisition\?\.content/);
  assert.match(createRouteSource, /acquisition_term:\s*acquisition\?\.term/);
  assert.match(createRouteSource, /acquisition_landing_path:\s*acquisition\?\.landing_path/);
});

test("admin marketing links copy RU/UA/DE paid request URLs with campaign UTM", () => {
  assert.match(marketingLinksSource, /https:\/\/freuly\.de\/ru\/request/);
  assert.match(marketingLinksSource, /https:\/\/freuly\.de\/ua\/request/);
  assert.match(marketingLinksSource, /https:\/\/freuly\.de\/de\/request/);
  assert.match(marketingLinksSource, /buildPaidRequestUrl/);
  assert.match(marketingLinksSource, /utm_campaign/);
  assert.match(marketingLinksSource, /NEMETSKIE_MUSLI_SHORT_URL/);
});

test("Nemetskie Musli short URL redirects to the RU paid request landing with attribution", () => {
  assert.match(shortLinkRouteSource, /buildPaidRequestPath\("ru", NEMETSKIE_MUSLI_UTM\)/);
  assert.match(shortLinkRouteSource, /NextResponse\.redirect\(destination, \{ status: 307 \}\)/);
  assert.match(shortLinksSource, /NEMETSKIE_MUSLI_SHORT_PATH = "\/go\/muesli"/);
  assert.match(shortLinksSource, /utm_source: "nemetskie_musli"/);
  assert.match(shortLinksSource, /utm_medium: "telegram"/);
  assert.match(shortLinksSource, /utm_campaign: "client_demand_launch"/);
});

test("public live demand feed never selects client contact fields or description", () => {
  assert.match(publicFeedSource, /from\("service_request_promotions"\)/);
  assert.match(publicFeedSource, /public_title, public_summary/);
  assert.match(publicFeedSource, /\.eq\("status", "published"\)/);
  assert.match(publicFeedSource, /\.is\("closed_at", null\)/);
  assert.match(publicFeedSource, /localized_copy/);
  assert.match(publicFeedSource, /PROMOTION_PUBLIC_SELECT_WITHOUT_LOCALIZED_COPY|WITHOUT_LOCALIZED_COPY|without localized_copy|fallbackPromotionRows/);
  assert.doesNotMatch(publicFeedSource, /\.eq\("locale", lang\)/);
  assert.match(publicFeedSource, /category_id, category_text/);
  assert.doesNotMatch(publicFeedSource, /client_name/);
  assert.doesNotMatch(publicFeedSource, /client_email/);
  assert.doesNotMatch(publicFeedSource, /client_phone/);
  assert.doesNotMatch(publicFeedSource, /\.select\([^\n]*description/);
  assert.match(publicFeedSource, /ACTIVE_REQUEST_STATUSES/);
  assert.match(publicFeedSource, /MAX_AGE_HOURS = LIVE_DEMAND_MAX_AGE_HOURS/);
  assert.match(publicFeedSource, /LIVE_DEMAND_MAX_AGE_HOURS/);
});
