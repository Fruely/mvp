export function getSpecialistUrl(
  lang: string,
  specialist: { id: string; slug?: string | null },
): string {
  const slug = specialist.slug?.trim();
  if (!slug && process.env.NODE_ENV === "development") {
    throw new Error(`Missing slug for specialist ${specialist.id}`);
  }
  const segment = slug || specialist.id;
  return `/${lang}/specialist/${encodeURIComponent(segment)}`;
}
