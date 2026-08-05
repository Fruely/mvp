/**
 * Central Freuly legal identity — single server-side source of truth.
 * Steuernummer is internal-only and must not be exposed in public bundles.
 */

export const FREULY_LEGAL_IDENTITY = {
  legalName: "Natalia Sheshenia",
  businessName: "Sheshenia – Freuly",
  street: "Hofolper Straße 46",
  postalCode: "57399",
  city: "Kirchhundem",
  /** Single-line city/postal for legal documents */
  cityLine: "57399 Kirchhundem",
  country: "Deutschland",
  email: "freuly.de@gmail.com",
  phone: "+49 160 92686432",
  /** Wirtschafts-Identifikationsnummer base (BZSt) */
  widnr: "DE464033560",
  /** Unterscheidungsmerkmal W-IdNr. */
  widnrBusinessUnit: "00001",
  /** USt-IdNr. gemäß § 27a UStG — same base number as widnr in BZSt letter */
  vatId: "DE464033560",
  /** Steuernummer Finanzamt — internal accounting only */
  taxNumber: "338/5113/3647",
} as const;

export type FreulyPublicIdentity = {
  legalName: string;
  businessName: string;
  street: string;
  postalCode: string;
  city: string;
  cityLine: string;
  country: string;
  email: string;
  phone: string;
  widnr: string;
  widnrBusinessUnit: string;
  vatId: string;
};

/** Public legal identity — excludes Steuernummer. Safe for Impressum, Agreement, PDF. */
export function getFreulyPublicIdentity(): FreulyPublicIdentity {
  const i = FREULY_LEGAL_IDENTITY;
  return {
    legalName: i.legalName,
    businessName: i.businessName,
    street: i.street,
    postalCode: i.postalCode,
    city: i.city,
    cityLine: i.cityLine,
    country: i.country,
    email: i.email,
    phone: i.phone,
    widnr: i.widnr,
    widnrBusinessUnit: i.widnrBusinessUnit,
    vatId: i.vatId,
  };
}

export function formatFreulyWidnr(): string {
  const i = FREULY_LEGAL_IDENTITY;
  return `${i.widnr}-${i.widnrBusinessUnit}`;
}

/** Internal-only — never import from client components. */
export function getFreulyInternalTaxNumber(): string {
  return FREULY_LEGAL_IDENTITY.taxNumber;
}

/** Legacy alias used by Partner Agreement provider block */
export function getPartnerAgreementProvider() {
  const p = getFreulyPublicIdentity();
  return {
    name: p.legalName,
    tradeName: p.businessName,
    street: p.street,
    cityLine: p.cityLine,
    country: p.country,
    email: p.email,
    phone: p.phone,
    vatId: p.vatId,
    widnr: formatFreulyWidnr(),
  } as const;
}

export function formatImpressumOperatorBlockDe(): string {
  const p = getFreulyPublicIdentity();
  return `${p.legalName}\nhandelnd unter der Geschäftsbezeichnung ${p.businessName}\n${p.street}\n${p.cityLine}\n${p.country}`;
}

export function formatImpressumTaxBlockDe(): string {
  const p = getFreulyPublicIdentity();
  return `Umsatzsteuer-Identifikationsnummer gemäß § 27a UStG:\n${p.vatId}\n\nWirtschafts-Identifikationsnummer:\n${formatFreulyWidnr()}`;
}
