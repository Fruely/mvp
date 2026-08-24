#!/usr/bin/env node
/**
 * Generates final-review legal markdown files under docs/legal/final-review/.
 */
import { mkdirSync, writeFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderMarkdown, countMarkers } from "./lib/render.mjs";
import { AGB_BLOCKS } from "./data/agb.mjs";
import { SPECIALIST_RULES_BLOCKS } from "./data/specialist-rules.mjs";
import { DATENSCHUTZ_BLOCKS } from "./data/datenschutz.mjs";
import { PARTNERPROGRAMM_BLOCKS } from "./data/partnerprogramm.mjs";
import { CHECKOUT_COPY_BLOCKS } from "./data/checkout-copy.mjs";
import { COOKIE_COPY_BLOCKS } from "./data/cookie-copy.mjs";
import { RANKING_BLOCKS } from "./data/ranking.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "../../docs/legal/final-review");

function applyPlanDisplayBranding(text) {
  return text
    .replaceAll("Freuly Professional", "Freuly Pro")
    .replaceAll("Freuly Growth", "Freuly Pro Premium")
    .replaceAll("Professional oder Growth", "Pro oder Pro Premium")
    .replaceAll("Professional or Growth", "Pro or Pro Premium")
    .replaceAll("Professional или Growth", "Pro или Pro Premium")
    .replaceAll("Professional або Growth", "Pro або Pro Premium");
}

const README = `# Final Legal Review Pack — INTERNAL

> **Status: REVIEW ONLY** — These files are for lawyer review. They are not yet wired into production routes.

## Document versions

| Document | Version | Date |
|----------|---------|------|
| AGB (Spezialisten) | 1.0 | August 2026 |
| Spezialisten-Regeln | 2.0 | August 2026 |
| Datenschutz | — | August 2026 |
| Partnerprogramm | 1.2 | August 2026 |
| Checkout copy | — | August 2026 |
| Cookie copy | — | August 2026 |
| Ranking disclosure | — | August 2026 |

## Code-verified facts

- **Operator (public):** Natalia Sheshenia, Sheshenia – Freuly, Hofolper Straße 46, 57399 Kirchhundem, Deutschland. Email: freuly.de@gmail.com. Phone: +49 160 92686432. USt-IdNr.: DE464033560. W-IdNr.: DE464033560-00001. **Steuernummer is internal-only** (\`lib/legal/freulyIdentity.ts\`, not in public bundles).
- **Prices:** Pro 29 €/month, Pro Premium 59 €/month, Promoted Request 10 € one-time (\`locales/de.json\` pricing section).
- **7-day grace:** Subscription grace period and Promoted credit window (\`locales/de.json\` dashboard billing strings).
- **Partner validation:** 14 calendar days (\`content/partners/agreementContentV10.ts\` constant; v1.2 text uses same rule).
- **Referral cookie:** \`freuly_partner_ref\`, 90 days (\`lib/partners/cookie.ts\` \`PARTNER_REF_MAX_AGE_SEC\`).
- **Payout model:** Manual SEPA bank transfer, admin queue (\`docs/architecture/decisions/003-referral-program-production-architecture.md\`, \`components/admin/AdminPartnerPayoutQueue.tsx\`). No Stripe Connect for partner payouts in canonical architecture.
- **Ranking SQL:** \`distance ASC, is_pro DESC, rating DESC NULLS LAST\` (\`supabase/manual_migrations/2026-07-18_search_specialists_local_radius_v2.sql\`).

## is_pro investigation (Finding B)

- **Column:** \`specialists.is_pro\` (boolean), read in search RPC projection.
- **TypeScript:** No application-level setter for \`is_pro\` was found in TS/TSX sources; only SQL read paths and migration/check scripts reference it.
- **Legal wording:** Public docs use neutral phrase **„internes profilspezifisches Prioritätsmerkmal“** instead of a tariff/product label.
- **Lawyer item:** Confirm mapping from paid tariff → \`is_pro\` flag and whether P2B disclosure is sufficient without naming the tariff.

## Client-lead GDPR reasoning

- **Direct client leads** (contact form to specialist): Art. 6(1)(f) DSGVO — legitimate interests: user request forwarding, specialist receipt of relevant requests, Freuly platform operation (Block F in Datenschutz draft).
- **Structured service requests:** Art. 6(1)(b) pre-contractual measures at user request plus Art. 6(1)(f) for security/abuse prevention (Block G).
- **Lawyer item:** Confirm whether end-users need separate privacy notice at lead submission.

## Third-country transfer research (supporting evidence only)

Public Datenschutz draft uses conservative wording: providers may rely on adequacy and/or appropriate safeguards (e.g. EU SCCs) depending on relationship. Do **not** claim Freuly executes a specific DPA/DPF unless verified in production.

| Provider | EU-relevant entity / docs | Outside EEA possible | Disclosed mechanism (official docs) |
|----------|---------------------------|------------------------|-------------------------------------|
| Supabase | Supabase Pte. Ltd.; https://supabase.com/legal/dpa | Yes | EU SCCs (2021/914) in DPA |
| Stripe | Stripe Payments Europe Ltd.; https://stripe.com/legal/dpa | Yes | SCCs; EU-US DPF in Stripe privacy materials |
| Vercel | Vercel Inc.; https://vercel.com/legal/dpa | Yes (US/global) | SCCs in DPA |
| Google (GA4) | Google Ireland Ltd.; https://policies.google.com/privacy/frameworks | Yes | SCCs; DPF certification stated |
| Resend | Plus Five Five, Inc.; https://resend.com/legal/dpa | Yes (US) | SCCs; DPF certification stated |
| DeepL | DeepL SE (DE); https://www.deepl.com/en/privacy | Possible via sub-processors | SCCs / DPF in DeepL materials |
| Telegram | https://telegram.org/privacy | Operator outside EEA | EDPO Art. 27 representative |
| Upstash | https://upstash.com/static/trust/dpa.pdf | Yes | SCCs in DPA |
| OSM/Nominatim | OSMF / Nominatim | Not fully verified for Freuly routing | Internal review — neutral public wording |

**Lawyer item:** Confirm executed DPAs and applicable transfer mechanisms per vendor.

## Consent design (recommended — NOT implemented)

**Problem:** Consent state is primarily in \`localStorage\`; server route \`/r/{code}\` cannot read it.

**Recommended flow:**

1. User opens \`/r/{code}\`.
2. Server validates partner/link.
3. If consent cookie allows referral tracking → set signed HttpOnly \`freuly_partner_ref\` (90 days).
4. If no referral consent → do **not** set attribution cookie.
5. Preserve only a short-lived signed referral-intent token (URL or transient session) — no fingerprinting, no IP persistence.
6. After explicit referral consent, client submits pending token to server endpoint.
7. Server validates token → sets HttpOnly \`freuly_partner_ref\`.
8. If user declines → no referral attribution cookie.
9. Withdrawal prevents future set/re-set per consent state.
10. Preserve GA4 consent behaviour; mirror categories to server-readable \`freuly_consent_v1\` when banner saves.

Do **not** classify long-lived referral identifier as necessary. Do **not** implement in this review pass.

## Items for lawyer review

1. AGB §19 restriction notice timing on durable medium.
2. AGB §20 / §25 P2B notice periods (30 / 15 calendar days).
3. AGB §22 data access scope post-termination.
4. Partnerprogramm §7 manual SEPA vs. any legacy Stripe Connect UI remnants.
5. Datenschutz Blocks D/E legal basis for lead types.
6. Cookie category reduction (no External Media) vs. current production banner.
7. Ranking disclosure vs. EU 2019/1150 parameter transparency.
8. RU/UA translations — convenience only; DE authoritative.

---

Generated by \`scripts/legal/generate-final-review.mjs\`. Do not edit generated files by hand; edit source data and re-run generator.
`;

const DOCS = [
  { base: "agb", blocks: AGB_BLOCKS },
  { base: "specialist-rules", blocks: SPECIALIST_RULES_BLOCKS },
  { base: "datenschutz", blocks: DATENSCHUTZ_BLOCKS },
  { base: "partnerprogramm", blocks: PARTNERPROGRAMM_BLOCKS },
  { base: "checkout-copy", blocks: CHECKOUT_COPY_BLOCKS },
  { base: "cookie-copy", blocks: COOKIE_COPY_BLOCKS },
  { base: "ranking", blocks: RANKING_BLOCKS },
];

mkdirSync(OUT_DIR, { recursive: true });

const report = [];

for (const { base, blocks } of DOCS) {
  for (const lang of ["de", "ru", "ua"]) {
    const filename = `${base}.${lang}.md`;
    const filepath = join(OUT_DIR, filename);
    const content = applyPlanDisplayBranding(renderMarkdown(blocks, lang));
    writeFileSync(filepath, content, "utf8");
    const bytes = statSync(filepath).size;
    report.push({ file: filename, bytes, markers: countMarkers(blocks) });
  }
}

const readmePath = join(OUT_DIR, "README.md");
writeFileSync(readmePath, README, "utf8");
report.push({ file: "README.md", bytes: statSync(readmePath).size, markers: 0 });

console.log("Generated final-review legal files:\n");
for (const row of report) {
  console.log(`${row.file}\t${row.bytes} bytes\tmarkers=${row.markers}`);
}
