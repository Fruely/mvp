export async function prepareLocalizedCopiesForPublish({ sourceLocale, title, summary, existing }) {
  const copy =
    existing && typeof existing === "object" && !Array.isArray(existing)
      ? { ...existing }
      : {};
  copy[sourceLocale] = { title, summary };
  for (const locale of ["ru", "ua", "de"]) {
    if (copy[locale]?.title && copy[locale]?.summary) continue;
    copy[locale] = {
      title: `${locale}:${title}`,
      summary: `${locale}:${summary}`,
    };
  }
  return copy;
}

export async function translatePublicCopyPair() {
  return null;
}
