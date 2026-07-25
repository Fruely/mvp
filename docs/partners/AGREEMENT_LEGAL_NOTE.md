# Partnerprogramm-Bedingungen v1.0 — internal legal note

German **Partnerprogramm-Bedingungen von Freuly** Version **1.0** is the working contractual draft for launch.

Before public scale-up and real partner payouts, recommend review by a German **Rechtsanwalt** / **Steuerberater** on the relevant questions (AGB, tax treatment, payout compliance).

- Source of truth (DE): `content/partners/agreementContent.ts` via `getPartnerAgreement("de")`
- Version / effective date: `content/partners/agreementMeta.ts`
- Acceptance stores `partners.agreement_version` + `partners.contract_signed_at`
- Audit payload also stores `agreement_locale` and SHA-256 of the canonical German text

Do **not** show a large technical disclaimer on every public partner page.
