export function getSpecialistUrl(
  lang: string,
  specialist: { id: string; slug?: string | null },
): string {
  const segment = specialist.slug?.trim() || specialist.id;
  return `/${lang}/specialist/${encodeURIComponent(segment)}`;
}
