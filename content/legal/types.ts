export const LEGAL_CONTENT_LANGS = ["de", "ua", "ru", "en"] as const;
export type LegalContentLang = (typeof LEGAL_CONTENT_LANGS)[number];

/** Public site locales that publish legal routes under `/{lang}/...`. */
export const LEGAL_PUBLIC_LANGS = ["ua", "ru", "de"] as const;
export type LegalPublicLang = (typeof LEGAL_PUBLIC_LANGS)[number];

export type LegalBlock =
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "link"; href: string; label: string; external?: boolean }
  | {
      type: "labeledLinks";
      lines: Array<{ label: string; href: string; value: string }>;
    };

export type LegalSection = {
  title: string;
  blocks: LegalBlock[];
};

export type LegalDocument = {
  metaTitle: string;
  metaDescription: string;
  title: string;
  subtitle?: string;
  stand: string;
  /** Shown on non-German versions only. */
  translationNotice?: string;
  sections: LegalSection[];
};

export function isLegalPublicLang(value: string): value is LegalPublicLang {
  return (LEGAL_PUBLIC_LANGS as readonly string[]).includes(value);
}

export function isLegalContentLang(value: string): value is LegalContentLang {
  return (LEGAL_CONTENT_LANGS as readonly string[]).includes(value);
}
