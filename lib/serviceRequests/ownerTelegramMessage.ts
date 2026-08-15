export type NewServiceRequestOwnerPayload = {
  public_id: string;
  category_text: string | null;
  preferred_language: string | null;
  work_format: string | null;
  city: string | null;
  postal_code: string | null;
  when_label: string | null;
  urgency: string | null;
  created_at: string | null;
  locale: string | null;
};

export function formatNewServiceRequestOwnerMessage(p: NewServiceRequestOwnerPayload): string {
  const appUrl = process.env.APP_URL || "https://freuly.de";
  const lines: string[] = [
    "Новый запрос на подбор (Freuly)",
    "",
    `Номер: ${p.public_id}`,
  ];
  const cat = p.category_text?.trim();
  if (cat) lines.push(`Категория: ${cat}`);
  const lang = p.preferred_language?.trim();
  if (lang) lines.push(`Язык: ${lang}`);
  const wf = p.work_format?.trim();
  if (wf) lines.push(`Формат: ${wf}`);
  const city = p.city?.trim();
  const plz = p.postal_code?.trim();
  if (city || plz) lines.push(`Локация: ${[plz, city].filter(Boolean).join(" ")}`);
  const when = p.when_label?.trim();
  if (when) lines.push(`Когда: ${when}`);
  if (p.created_at) lines.push(`Создан: ${p.created_at}`);
  if (p.locale) lines.push(`Locale: ${p.locale}`);
  lines.push("");
  lines.push("Контакты и описание доступны только в admin-зоне.");
  lines.push(`Admin: ${appUrl}/admin/service-requests`);
  return lines.join("\n");
}
