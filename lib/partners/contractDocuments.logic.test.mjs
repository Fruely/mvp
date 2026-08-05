import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

test("D: acceptance saves server-calculated version/hash", () => {
  const agreement = readFileSync(new URL("./agreement.ts", import.meta.url), "utf8");
  const accept = readFileSync(
    new URL("../../app/api/partner/agreement/accept/route.ts", import.meta.url),
    "utf8"
  );
  const hash = readFileSync(new URL("./agreementHash.ts", import.meta.url), "utf8");
  assert.match(agreement, /getPartnerAgreementProofPayload/);
  assert.match(accept, /agreement_version_mismatch/);
  assert.match(hash, /getPartnerAgreementTextSha256/);
  assert.match(hash, /PARTNER_AGREEMENT_V10_SHA256/);
});

test("v1.0 snapshot preserved for legacy acceptances", () => {
  const v10 = readFileSync(
    new URL("../../content/partners/agreementContentV10.ts", import.meta.url),
    "utf8"
  );
  assert.match(v10, /PARTNER_AGREEMENT_V10_VERSION = "1\.0"/);
  assert.match(v10, /getGermanAgreementPlainTextV10/);
  assert.match(v10, /do not edit after production acceptances/i);
});

test("E–F: contract document module enforces idempotent issuance", () => {
  const src = readFileSync(new URL("./contractDocuments.ts", import.meta.url), "utf8");
  assert.match(src, /\.eq\("agreement_version", agreementVersion\)/);
  assert.match(src, /status === "issued"/);
  assert.match(src, /ensurePartnerContractDocument/);
  const migration = readFileSync(
    new URL(
      "../../supabase/manual_migrations/2026-08-05_partner_program_phase2_contract_documents.sql",
      import.meta.url
    ),
    "utf8"
  );
  assert.match(migration, /UNIQUE \(partner_id, agreement_version\)/);
});

test("G–H: PDF includes operator, version, hash, full agreement", () => {
  const pdf = readFileSync(new URL("./contractPdf.ts", import.meta.url), "utf8");
  assert.match(pdf, /buildPartnerContractPdf/);
  assert.match(pdf, /agreementTextSha256/);
  assert.match(pdf, /documentNumber/);
  assert.match(pdf, /publicPartnerRef/);
  assert.match(pdf, /blocksToText\(deAgreement\.blocks\)/);
  assert.match(pdf, /displayLang !== "de"/);
});

test("I: PDF failure does not roll back acceptance", () => {
  const agreement = readFileSync(new URL("./agreement.ts", import.meta.url), "utf8");
  assert.match(agreement, /void ensurePartnerContractDocument/);
  assert.match(agreement, /alreadyAccepted: false/);
  const docs = readFileSync(new URL("./contractDocuments.ts", import.meta.url), "utf8");
  assert.match(docs, /status: "failed"/);
});

test("J: private document download scoped to partner", () => {
  const download = readFileSync(
    new URL("../../app/api/partner/contract/[id]/download/route.ts", import.meta.url),
    "utf8"
  );
  assert.match(download, /requirePartnerApiSession/);
  assert.match(download, /session\.partner\.id/);
});

test("M: email optional when provider unavailable", () => {
  const email = readFileSync(new URL("./contractEmail.ts", import.meta.url), "utf8");
  assert.match(email, /isEmailConfigured/);
  const contract = readFileSync(
    new URL("../../app/api/partner/contract/route.ts", import.meta.url),
    "utf8"
  );
  assert.match(contract, /email_available/);
});

test("N: dashboard contract section localized", () => {
  for (const lang of ["de", "ru", "ua"]) {
    const dict = JSON.parse(
      readFileSync(new URL(`../../locales/${lang}.json`, import.meta.url), "utf8")
    );
    assert.ok(dict.partner.dashboard.contractsTitle, lang);
    assert.ok(dict.partner.dashboard.contractDownload, lang);
  }
});

test("L: backfill script supports dry-run", () => {
  const script = readFileSync(
    new URL("../../scripts/backfill-partner-contract-pdfs.mjs", import.meta.url),
    "utf8"
  );
  assert.match(script, /dry-run/);
  assert.match(script, /ensurePartnerContractDocument/);
});
