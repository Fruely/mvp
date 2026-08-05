import type { SupabaseClient } from "@supabase/supabase-js";
import type { Lang } from "@/lib/i18n";
import { PARTNER_AGREEMENT_LEGACY_VERSION } from "@/content/partners/agreementMeta";
import { getPartnerAgreementProofPayload } from "@/lib/partners/agreementHash";
import { buildPartnerContractPdf } from "@/lib/partners/contractPdf";
import { sendPartnerContractEmail } from "@/lib/partners/contractEmail";
import { PartnerDomainError } from "@/lib/partners/errors";
import type { PartnerRow } from "@/lib/partners/types";

export type PartnerContractDocumentStatus = "pending" | "issued" | "failed";

export type PartnerContractDocumentRow = {
  id: string;
  partner_id: string;
  agreement_version: string;
  agreement_locale: string;
  agreement_text_sha256: string;
  accepted_at: string;
  issued_at: string | null;
  document_number: string;
  storage_path: string | null;
  status: PartnerContractDocumentStatus;
  generation_attempts: number;
  last_error_code: string | null;
  audit_log_id: string | null;
  emailed_at: string | null;
  created_at: string;
  updated_at: string;
};

const BUCKET = "partner-contracts";

function nowIso(): string {
  return new Date().toISOString();
}

function storagePathFor(partnerId: string, documentId: string): string {
  return `partner-contracts/${partnerId}/${documentId}.pdf`;
}

async function allocateDocumentNumber(
  supabase: SupabaseClient,
  year: number
): Promise<string> {
  const { data, error } = await supabase.rpc("next_partner_contract_document_number", {
    p_year: year,
  });
  if (!error && typeof data === "string") return data;

  // Fallback if RPC not yet applied — use sequence directly via raw increment pattern.
  const { data: seqVal, error: seqErr } = await supabase
    .from("partner_contract_documents")
    .select("document_number")
    .like("document_number", `FPA-${year}-%`)
    .order("document_number", { ascending: false })
    .limit(1);
  if (seqErr) throw new PartnerDomainError("contract_document_number_failed", 500);
  const last = seqVal?.[0]?.document_number as string | undefined;
  const lastSeq = last ? Number.parseInt(last.split("-")[2] || "0", 10) : 0;
  const next = lastSeq + 1;
  return `FPA-${year}-${String(next).padStart(6, "0")}`;
}

async function findLatestAuditId(
  supabase: SupabaseClient,
  partnerId: string,
  agreementVersion: string
): Promise<string | null> {
  const { data } = await supabase
    .from("partner_audit_log")
    .select("id, payload")
    .eq("partner_id", partnerId)
    .eq("action", "partner_agreement_accepted")
    .order("created_at", { ascending: false })
    .limit(5);
  const rows = (data ?? []) as Array<{ id: string; payload?: { agreement_version?: string } }>;
  for (const row of rows) {
    const payloadVersion = (row as { payload?: { agreement_version?: string } }).payload
      ?.agreement_version;
    if (!payloadVersion || payloadVersion === agreementVersion) return row.id;
  }
  return rows[0]?.id ?? null;
}

export async function getPartnerContractDocument(
  supabase: SupabaseClient,
  partnerId: string,
  agreementVersion: string
): Promise<PartnerContractDocumentRow | null> {
  const { data, error } = await supabase
    .from("partner_contract_documents")
    .select("*")
    .eq("partner_id", partnerId)
    .eq("agreement_version", agreementVersion)
    .maybeSingle();
  if (error) {
    console.error("[partners/contractDocuments] lookup failed", error.message);
    return null;
  }
  return (data as PartnerContractDocumentRow) ?? null;
}

export async function listPartnerContractDocuments(
  supabase: SupabaseClient,
  partnerId: string
): Promise<PartnerContractDocumentRow[]> {
  const { data, error } = await supabase
    .from("partner_contract_documents")
    .select("*")
    .eq("partner_id", partnerId)
    .order("accepted_at", { ascending: false });
  if (error) {
    console.error("[partners/contractDocuments] list failed", error.message);
    return [];
  }
  return (data ?? []) as PartnerContractDocumentRow[];
}

export async function ensurePartnerContractDocument(
  supabase: SupabaseClient,
  input: {
    partner: PartnerRow;
    agreementVersion: string;
    agreementLocale?: Lang | string | null;
    acceptedAt: string;
    userEmail: string;
  }
): Promise<PartnerContractDocumentRow | null> {
  const version = input.agreementVersion.trim();
  const locale = (input.agreementLocale || "de").trim().slice(0, 8) as Lang;
  const acceptedAt = input.acceptedAt;
  const partnerId = input.partner.id;

  const existing = await getPartnerContractDocument(supabase, partnerId, version);
  if (existing?.status === "issued" && existing.storage_path) {
    return existing;
  }

  const proof = getPartnerAgreementProofPayload(locale, version);
  const ts = nowIso();
  const year = new Date(acceptedAt).getFullYear();
  let docRow = existing;

  if (!docRow) {
    const documentNumber = await allocateDocumentNumber(supabase, year);
    const auditLogId = await findLatestAuditId(supabase, partnerId, version);
    const { data: inserted, error: insErr } = await supabase
      .from("partner_contract_documents")
      .insert({
        partner_id: partnerId,
        agreement_version: version,
        agreement_locale: locale,
        agreement_text_sha256: proof.agreement_text_sha256,
        accepted_at: acceptedAt,
        document_number: documentNumber,
        status: "pending",
        generation_attempts: 0,
        audit_log_id: auditLogId,
        created_at: ts,
        updated_at: ts,
      })
      .select("*")
      .maybeSingle();

    if (insErr?.code === "23505") {
      docRow = await getPartnerContractDocument(supabase, partnerId, version);
    } else if (insErr || !inserted) {
      console.error("[partners/contractDocuments] insert failed", insErr?.message);
      return null;
    } else {
      docRow = inserted as PartnerContractDocumentRow;
    }
  }

  if (!docRow) return null;
  if (docRow.status === "issued" && docRow.storage_path) return docRow;

  const attempts = (docRow.generation_attempts ?? 0) + 1;
  try {
    const pdfBuffer = await buildPartnerContractPdf({
      documentNumber: docRow.document_number,
      agreementVersion: version,
      agreementLocale: locale,
      agreementTextSha256: proof.agreement_text_sha256,
      acceptedAt,
      issuedAt: ts,
      partnerId,
      partnerEmail: input.userEmail || input.partner.email,
      partnerName: input.partner.name || null,
      auditReference: docRow.audit_log_id,
    });

    const path = storagePathFor(partnerId, docRow.id);
    const { error: uploadErr } = await supabase.storage.from(BUCKET).upload(path, pdfBuffer, {
      contentType: "application/pdf",
      upsert: true,
    });
    if (uploadErr) {
      throw new PartnerDomainError("contract_pdf_upload_failed", 500);
    }

    const { data: updated, error: updErr } = await supabase
      .from("partner_contract_documents")
      .update({
        status: "issued",
        issued_at: ts,
        storage_path: path,
        generation_attempts: attempts,
        last_error_code: null,
        updated_at: ts,
      })
      .eq("id", docRow.id)
      .eq("partner_id", partnerId)
      .select("*")
      .maybeSingle();

    if (updErr || !updated) {
      throw new PartnerDomainError("contract_document_update_failed", 500);
    }

    const issued = updated as PartnerContractDocumentRow;
    void trySendContractEmail(supabase, issued, input.userEmail || input.partner.email, locale);
    return issued;
  } catch (err) {
    const code =
      err instanceof PartnerDomainError
        ? err.code
        : err instanceof Error
          ? err.message.slice(0, 120)
          : "contract_pdf_failed";
    await supabase
      .from("partner_contract_documents")
      .update({
        status: "failed",
        generation_attempts: attempts,
        last_error_code: code,
        updated_at: ts,
      })
      .eq("id", docRow.id);
    console.error("[partners/contractDocuments] generation failed", code);
    return { ...docRow, status: "failed", last_error_code: code } as PartnerContractDocumentRow;
  }
}

async function trySendContractEmail(
  supabase: SupabaseClient,
  doc: PartnerContractDocumentRow,
  email: string,
  locale: Lang
): Promise<void> {
  if (doc.emailed_at || !email.includes("@")) return;
  try {
    const { data: file, error } = await supabase.storage.from(BUCKET).download(doc.storage_path!);
    if (error || !file) return;
    const buffer = Buffer.from(await file.arrayBuffer());
    const sent = await sendPartnerContractEmail({
      to: email,
      locale,
      documentNumber: doc.document_number,
      agreementVersion: doc.agreement_version,
      acceptedAt: doc.accepted_at,
      pdfBuffer: buffer,
    });
    if (sent) {
      await supabase
        .from("partner_contract_documents")
        .update({ emailed_at: nowIso(), updated_at: nowIso() })
        .eq("id", doc.id);
    }
  } catch (err) {
    console.error("[partners/contractDocuments] email failed", err);
  }
}

export async function getPartnerContractDownloadBuffer(
  supabase: SupabaseClient,
  partnerId: string,
  documentId: string
): Promise<{ buffer: Buffer; filename: string; document: PartnerContractDocumentRow } | null> {
  const { data: doc, error } = await supabase
    .from("partner_contract_documents")
    .select("*")
    .eq("id", documentId)
    .eq("partner_id", partnerId)
    .maybeSingle();
  if (error || !doc || doc.status !== "issued" || !doc.storage_path) return null;

  const row = doc as PartnerContractDocumentRow;
  if (!row.storage_path) return null;
  const { data: file, error: dlErr } = await supabase.storage.from(BUCKET).download(row.storage_path);
  if (dlErr || !file) return null;
  const buffer = Buffer.from(await file.arrayBuffer());
  return {
    buffer,
    filename: `freuly-partner-contract-${row.document_number}.pdf`,
    document: row,
  };
}

export async function resendPartnerContractEmail(
  supabase: SupabaseClient,
  partnerId: string,
  documentId: string,
  email: string,
  locale: Lang
): Promise<boolean> {
  const { data: doc } = await supabase
    .from("partner_contract_documents")
    .select("*")
    .eq("id", documentId)
    .eq("partner_id", partnerId)
    .maybeSingle();
  if (!doc || doc.status !== "issued" || !doc.storage_path) return false;
  const row = doc as PartnerContractDocumentRow;
  if (!row.storage_path) return false;
  const { data: file } = await supabase.storage.from(BUCKET).download(row.storage_path);
  if (!file) return false;
  const buffer = Buffer.from(await file.arrayBuffer());
  const sent = await sendPartnerContractEmail({
    to: email,
    locale,
    documentNumber: row.document_number,
    agreementVersion: row.agreement_version,
    acceptedAt: row.accepted_at,
    pdfBuffer: buffer,
  });
  if (sent) {
    await supabase
      .from("partner_contract_documents")
      .update({ emailed_at: nowIso(), updated_at: nowIso() })
      .eq("id", row.id);
  }
  return sent;
}

/** Resolve agreement version for an already-accepted partner (supports legacy v1.0). */
export function resolveAcceptedAgreementVersion(partner: PartnerRow): string {
  return partner.agreement_version?.trim() || PARTNER_AGREEMENT_LEGACY_VERSION;
}
