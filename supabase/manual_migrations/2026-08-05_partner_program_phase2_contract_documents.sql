-- Partner Program Phase 2: contract confirmation documents (PDF metadata).
-- Manual migration — apply on staging before production.
-- Creates private storage bucket + partner_contract_documents table.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Document number sequence: FPA-YYYY-NNNNNN
CREATE SEQUENCE IF NOT EXISTS public.partner_contract_document_number_seq
  START WITH 1
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1;

CREATE TABLE IF NOT EXISTS public.partner_contract_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners (id) ON DELETE CASCADE,
  agreement_version text NOT NULL,
  agreement_locale text NOT NULL DEFAULT 'de',
  agreement_text_sha256 text NOT NULL,
  accepted_at timestamptz NOT NULL,
  issued_at timestamptz NULL,
  document_number text NOT NULL,
  storage_path text NULL,
  status text NOT NULL DEFAULT 'pending',
  generation_attempts integer NOT NULL DEFAULT 0,
  last_error_code text NULL,
  audit_log_id uuid NULL,
  emailed_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT partner_contract_documents_status_check CHECK (
    status IN ('pending', 'issued', 'failed')
  ),
  CONSTRAINT partner_contract_documents_sha256_check CHECK (
    agreement_text_sha256 ~ '^[a-f0-9]{64}$'
  ),
  CONSTRAINT partner_contract_documents_document_number_format CHECK (
    document_number ~ '^FPA-[0-9]{4}-[0-9]{6}$'
  ),
  CONSTRAINT partner_contract_documents_unique_partner_version UNIQUE (partner_id, agreement_version),
  CONSTRAINT partner_contract_documents_document_number_unique UNIQUE (document_number)
);

CREATE INDEX IF NOT EXISTS idx_partner_contract_documents_partner_id
  ON public.partner_contract_documents (partner_id);

CREATE INDEX IF NOT EXISTS idx_partner_contract_documents_status
  ON public.partner_contract_documents (status);

COMMENT ON TABLE public.partner_contract_documents IS
  'Immutable partner contract confirmation PDF metadata. One row per partner + agreement version.';

ALTER TABLE public.partner_contract_documents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.partner_contract_documents FROM anon, authenticated;
GRANT ALL ON public.partner_contract_documents TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.partner_contract_document_number_seq TO service_role;

CREATE OR REPLACE FUNCTION public.next_partner_contract_document_number(p_year integer)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  seq_val bigint;
BEGIN
  seq_val := nextval('public.partner_contract_document_number_seq');
  RETURN 'FPA-' || p_year::text || '-' || lpad(seq_val::text, 6, '0');
END;
$$;

REVOKE ALL ON FUNCTION public.next_partner_contract_document_number(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.next_partner_contract_document_number(integer) TO service_role;

-- Private storage bucket for contract PDFs (not public).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'partner-contracts',
  'partner-contracts',
  false,
  10485760,
  ARRAY['application/pdf']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

COMMIT;

-- Verification (run after apply):
-- SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_name = 'partner_contract_documents' ORDER BY ordinal_position;
-- SELECT id, public FROM storage.buckets WHERE id = 'partner-contracts';
