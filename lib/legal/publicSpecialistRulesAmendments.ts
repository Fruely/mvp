import type { LegalPublicLang } from "@/content/legal/types";

function replaceNumberedSection(raw: string, sectionNumber: number, nextSectionNumber: number, replacement: string) {
  const pattern = new RegExp(
    `## ${sectionNumber}\\.[^\\n]*\\n[\\s\\S]*?(?=\\n## ${nextSectionNumber}\\.)`,
  );
  return raw.replace(pattern, replacement.trim());
}

const SECTION_9: Record<LegalPublicLang, string> = {
  de: `## 9. Keine Erfolgsgarantie

Freuly stellt die vereinbarten Plattformfunktionen bereit und betreibt einen Kanal zur Gewinnung und Zuordnung von Kundenanfragen. Freuly garantiert jedoch weder eine bestimmte Anzahl oder Qualität von Anfragen noch Kunden, Vertragsabschlüsse, Umsatz oder einen konkreten wirtschaftlichen Erfolg. Die Zahlung eines Tarifs ist keine Zahlung für eine garantierte Zahl von Leads, sondern für die im jeweiligen Tarif beschriebenen Plattformfunktionen und die kommerzielle Teilnahme am Anfragekanal.`,
  ru: `## 9. Отсутствие гарантий результата

Freuly предоставляет согласованные функции платформы и развивает канал привлечения и распределения клиентских заявок. При этом Freuly не гарантирует определённое количество или качество заявок, клиентов, заключённых договоров, доход или иной конкретный коммерческий результат. Оплата тарифа не является оплатой гарантированного количества лидов, а оплачивает описанные в соответствующем тарифе функции платформы и коммерческое участие в канале заявок.`,
  ua: `## 9. Відсутність гарантій результату

Freuly надає погоджені функції платформи та розвиває канал залучення й розподілу клієнтських запитів. Водночас Freuly не гарантує певну кількість або якість запитів, клієнтів, укладених договорів, дохід чи інший конкретний комерційний результат. Оплата тарифу не є оплатою гарантованої кількості лідів, а оплачує описані у відповідному тарифі функції платформи та комерційну участь у каналі запитів.`,
};

const CLOSE: Record<LegalPublicLang, string> = {
  de: "Mit der Registrierung und Annahme dieser Regeln bestätigt der Spezialist, dass er diese Regeln versteht, akzeptiert und einhalten wird. Die öffentliche Veröffentlichung eines neuen Profils erfolgt nach Maßgabe der jeweils geltenden Tarif- und Veröffentlichungsbedingungen.",
  ru: "Регистрируясь и принимая настоящие Правила, специалист подтверждает, что понимает, принимает и будет их соблюдать. Публичная публикация нового профиля осуществляется в соответствии с действующими условиями тарифа и публикации.",
  ua: "Реєструючись і приймаючи ці Правила, спеціаліст підтверджує, що розуміє, приймає та дотримуватиметься їх. Публічна публікація нового профілю здійснюється відповідно до чинних умов тарифу та публікації.",
};

export function applyPublicSpecialistRulesAmendments(
  slug: string,
  lang: LegalPublicLang,
  raw: string,
): string {
  if (slug !== "specialist-rules") return raw;
  let result = replaceNumberedSection(raw, 9, 10, SECTION_9[lang]);
  result = result.replace(
    /(## (?:Заключительное положение|Заключне положення|Schlussbestimmung)\s*\n(?:\s*<!--[^>]+-->\s*\n)?)[\s\S]*$/,
    `$1${CLOSE[lang]}\n`,
  );
  return result;
}
