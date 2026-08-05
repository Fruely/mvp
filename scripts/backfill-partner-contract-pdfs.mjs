#!/usr/bin/env node
/**
 * Idempotent backfill of partner contract PDFs for existing accepted partners.
 * Usage:
 *   node scripts/backfill-partner-contract-pdfs.mjs --dry-run
 *   node scripts/backfill-partner-contract-pdfs.mjs
 */
import { createClient } from "@supabase/supabase-js";

const dryRun = process.argv.includes("--dry-run");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const { ensurePartnerContractDocument, resolveAcceptedAgreementVersion } = await import(
  "../lib/partners/contractDocuments.ts"
);

const supabase = createClient(url, key);

const { data: partners, error } = await supabase
  .from("partners")
  .select("id, email, name, agreement_version, contract_signed_at, status")
  .not("contract_signed_at", "is", null)
  .order("contract_signed_at", { ascending: true });

if (error) {
  console.error("Query failed:", error.message);
  process.exit(1);
}

const rows = partners ?? [];
console.log(`Eligible accepted partners: ${rows.length}`);
if (dryRun) {
  for (const p of rows) {
    console.log(
      `- ${p.id} version=${p.agreement_version || "1.0"} accepted=${p.contract_signed_at}`
    );
  }
  process.exit(0);
}

let issued = 0;
let failed = 0;
for (const p of rows) {
  const version = resolveAcceptedAgreementVersion(p);
  try {
    const doc = await ensurePartnerContractDocument(supabase, {
      partner: p,
      agreementVersion: version,
      agreementLocale: "de",
      acceptedAt: p.contract_signed_at,
      userEmail: p.email,
    });
    if (doc?.status === "issued") issued += 1;
    else failed += 1;
    console.log(`${p.id} -> ${doc?.status ?? "null"} (${doc?.document_number ?? "-"})`);
  } catch (err) {
    failed += 1;
    console.error(`${p.id} failed`, err);
  }
}

console.log(`Done. issued=${issued} failed=${failed}`);
