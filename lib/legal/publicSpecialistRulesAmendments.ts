import type { LegalPublicLang } from "@/content/legal/types";

function replaceNumberedSection(raw: string, sectionNumber: number, nextSectionNumber: number, replacement: string) {
  const pattern = new RegExp(
    `## ${sectionNumber}\\.[^\\n]*\\n[\\s\\S]*?(?=\\n## ${nextSectionNumber}\\.)`,
  );
  return raw.replace(pattern, replacement.trim());
}

const SECTION_9: Record<LegalPublicLang, string> = {
  de: `## 9. Keine Erfolgsgarantie

Freuly stellt die vereinbarten Plattformfunktionen bereit und betreibt einen Kanal zur Gewinnung und Zuordnung von Kundenanfragen. Die Veröffentlichung des Basisprofils erfordert keinen kostenpflichtigen Tarif. Kostenpflichtig können der Zugang zu einer konkreten Anfrage und/oder Funktionen von Professional oder Growth sein. Freuly garantiert weder eine bestimmte Anzahl oder Qualität von Anfragen noch Kunden, Vertragsabschlüsse, Umsatz oder einen konkreten wirtschaftlichen Erfolg. Zahlungen betreffen den beschriebenen Zugang bzw. die Plattformfunktionen und nicht eine garantierte Zahl von Leads. Spezialisten sollen auf erhaltene Anfragen verantwortungsvoll reagieren: eine passende Anfrage freischalten, eine unpassende Anfrage zeitnah ablehnen oder ihren Status auf andere Weise kennzeichnen, soweit die jeweilige Funktion verfügbar ist.`,
  ru: `## 9. Отсутствие гарантий результата

Freuly предоставляет согласованные функции платформы и развивает канал привлечения и распределения клиентских заявок. Публикация базового профиля не требует платного тарифа. Платными могут быть доступ к конкретной заявке и/или функции Professional или Growth. Freuly не гарантирует определённое количество или качество заявок, клиентов, заключённых договоров, доход или иной конкретный коммерческий результат. Оплата относится к описанному доступу или функциям платформы, а не к гарантированному количеству лидов. Специалист обязан добросовестно реагировать на полученные запросы: открыть подходящую заявку, своевременно отказаться от неподходящей либо иным способом обозначить её статус, если такая функция доступна.`,
  ua: `## 9. Відсутність гарантій результату

Freuly надає погоджені функції платформи та розвиває канал залучення й розподілу клієнтських запитів. Публікація базового профілю не потребує платного тарифу. Платними можуть бути доступ до конкретного запиту та/або функції Professional чи Growth. Freuly не гарантує певну кількість або якість запитів, клієнтів, укладених договорів, дохід чи інший конкретний комерційний результат. Оплата стосується описаного доступу або функцій платформи, а не гарантованої кількості лідів. Спеціаліст має добросовісно реагувати на отримані запити: відкрити відповідний запит, своєчасно відмовитися від невідповідного або іншим способом позначити його статус, якщо така функція доступна.`,
};

const CLOSE: Record<LegalPublicLang, string> = {
  de: "Mit der Registrierung und Annahme dieser Regeln bestätigt der Spezialist, dass er diese Regeln versteht, akzeptiert und einhalten wird. Ein vollständiges Basisprofil kann nach den geltenden Veröffentlichungsregeln ohne kostenpflichtigen Tarif veröffentlicht werden; kostenpflichtiger Anfragezugang und Tariffunktionen richten sich nach den jeweils angezeigten Bedingungen.",
  ru: "Регистрируясь и принимая настоящие Правила, специалист подтверждает, что понимает, принимает и будет их соблюдать. Полностью заполненный базовый профиль может быть опубликован по действующим правилам публикации без платного тарифа; платный доступ к заявкам и функции тарифов регулируются условиями, показанными перед соответствующей покупкой.",
  ua: "Реєструючись і приймаючи ці Правила, спеціаліст підтверджує, що розуміє, приймає та дотримуватиметься їх. Повністю заповнений базовий профіль може бути опублікований за чинними правилами публікації без платного тарифу; платний доступ до запитів і функції тарифів регулюються умовами, показаними перед відповідною покупкою.",
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
