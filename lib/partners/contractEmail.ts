import type { Lang } from "@/lib/i18n";
import { sendEmailWithAttachment, isEmailConfigured } from "@/lib/email";

const SUBJECTS: Record<Lang, string> = {
  de: "Bestätigung Ihrer Teilnahme am Freuly-Partnerprogramm",
  ru: "Подтверждение участия в партнёрской программе Freuly",
  ua: "Підтвердження участі в партнерській програмі Freuly",
};

const BODY_INTRO: Record<Lang, string> = {
  de: "Vielen Dank für Ihre Teilnahme am Freuly-Partnerprogramm. Im Anhang finden Sie die Bestätigung über Ihre elektronische Annahme der Partnerprogramm-Bedingungen.",
  ru: "Спасибо за участие в партнёрской программе Freuly. Во вложении — подтверждение вашего электронного принятия условий партнёрской программы.",
  ua: "Дякуємо за участь у партнерській програмі Freuly. У вкладенні — підтвердження вашого електронного прийняття умов партнерської програми.",
};

const BODY_PAYOUT_NOTE: Record<Lang, string> = {
  de: "Für die Teilnahme am Partnerprogramm sind zunächst keine Steuer- oder Auszahlungsdaten erforderlich. Vor einer späteren Auszahlung in Geld werden die erforderlichen Angaben separat angefordert.",
  ru: "Для участия в партнёрской программе на данном этапе не требуются налоговые или платёжные данные. Перед будущей выплатой денежных средств необходимые сведения будут запрошены отдельно.",
  ua: "Для участі в партнерській програмі на цьому етапі не потрібні податкові чи платіжні дані. Перед майбутньою виплатою грошових коштів необхідні відомості будуть запрошені окремо.",
};

function formatAcceptedAt(iso: string, lang: Lang): string {
  try {
    const locale = lang === "de" ? "de-DE" : lang === "ru" ? "ru-RU" : "uk-UA";
    return new Date(iso).toLocaleString(locale, { timeZone: "Europe/Berlin" });
  } catch {
    return iso;
  }
}

export async function sendPartnerContractEmail(input: {
  to: string;
  locale: Lang;
  documentNumber: string;
  agreementVersion: string;
  acceptedAt: string;
  pdfBuffer: Buffer;
}): Promise<boolean> {
  if (!isEmailConfigured()) return false;
  const lang = input.locale;
  const html = `
    <p>${BODY_INTRO[lang]}</p>
    <p><strong>Version:</strong> ${input.agreementVersion}<br/>
    <strong>${lang === "de" ? "Annahme" : lang === "ru" ? "Принятие" : "Прийняття"}:</strong> ${formatAcceptedAt(input.acceptedAt, lang)}<br/>
    <strong>${lang === "de" ? "Dokumentnummer" : lang === "ru" ? "Номер документа" : "Номер документа"}:</strong> ${input.documentNumber}</p>
    <p>${BODY_PAYOUT_NOTE[lang]}</p>
    <p>Freuly · freuly.de</p>
  `;
  await sendEmailWithAttachment({
    to: input.to,
    subject: SUBJECTS[lang],
    html,
    attachments: [
      {
        filename: `freuly-partner-contract-${input.documentNumber}.pdf`,
        content: input.pdfBuffer,
      },
    ],
  });
  return true;
}

export { isEmailConfigured };
