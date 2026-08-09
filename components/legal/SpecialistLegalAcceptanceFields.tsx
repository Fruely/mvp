"use client";

import Link from "next/link";
import type { Lang } from "@/lib/i18n";
import { agbPath, privacyPath } from "@/lib/legal/paths";
import {
  SPECIALIST_AGB_VERSION,
  SPECIALIST_RULES_VERSION,
} from "@/lib/legal/specialistLegalMeta";

type Props = {
  lang: Lang;
  b2bAccepted: boolean;
  agbAccepted: boolean;
  rulesAccepted: boolean;
  privacyAcknowledged: boolean;
  onB2bChange: (value: boolean) => void;
  onAgbChange: (value: boolean) => void;
  onRulesChange: (value: boolean) => void;
  onPrivacyChange: (value: boolean) => void;
  error?: string | null;
};

function legalLinkLabel(lang: Lang, kind: "agb" | "rules" | "privacy"): string {
  if (kind === "agb") {
    if (lang === "de") return "AGB für Spezialisten";
    if (lang === "ru") return "AGB для специалистов";
    return "AGB для спеціалістів";
  }
  if (kind === "rules") {
    if (lang === "de") return "Regeln für Spezialisten";
    if (lang === "ru") return "Правила для специалистов";
    return "Правила для спеціалістів";
  }
  if (lang === "de") return "Datenschutzerklärung";
  if (lang === "ru") return "Политику конфиденциальности";
  return "Політику конфіденційності";
}

export default function SpecialistLegalAcceptanceFields({
  lang,
  b2bAccepted,
  agbAccepted,
  rulesAccepted,
  privacyAcknowledged,
  onB2bChange,
  onAgbChange,
  onRulesChange,
  onPrivacyChange,
  error,
}: Props) {
  const agbHref = agbPath(lang);
  const rulesHref = `/${lang}/specialist-rules`;
  const privacyHref = privacyPath(lang);

  const b2bText =
    lang === "de"
      ? "Ich bestätige, dass ich Freuly im Rahmen meiner selbständigen beruflichen oder gewerblichen Tätigkeit nutze und nicht als Verbraucher (§ 13 BGB) handle."
      : lang === "ru"
        ? "Я подтверждаю, что использую Freuly в рамках самостоятельной профессиональной или предпринимательской деятельности и не как потребитель (§ 13 BGB)."
        : "Я підтверджую, що використовую Freuly у межах самостійної професійної або підприємницької діяльності і не як споживач (§ 13 BGB).";

  const b2bHint =
    lang === "de"
      ? "Freuly prüft Ihren Unternehmerstatus nicht und verlangt für die normale Registrierung keinen Gewerbeschein."
      : lang === "ru"
        ? "Freuly не проверяет ваш предпринимательский статус и не требует Gewerbeschein для обычной регистрации."
        : "Freuly не перевіряє ваш підприємницький статус і не вимагає Gewerbeschein для звичайної реєстрації.";

  const agbText =
    lang === "de"
      ? `Ich habe die AGB für Spezialisten (Version ${SPECIALIST_AGB_VERSION}) gelesen und akzeptiere sie.`
      : lang === "ru"
        ? `Я прочитал(а) AGB для специалистов (версия ${SPECIALIST_AGB_VERSION}) и принимаю их.`
        : `Я прочитав(ла) AGB для спеціалістів (версія ${SPECIALIST_AGB_VERSION}) і приймаю їх.`;

  const rulesText =
    lang === "de"
      ? `Ich habe die Regeln für die Platzierung von Spezialisten (Version ${SPECIALIST_RULES_VERSION}) gelesen und verpflichte mich, sie einzuhalten.`
      : lang === "ru"
        ? `Я прочитал(а) правила размещения специалистов (версия ${SPECIALIST_RULES_VERSION}) и обязуюсь их соблюдать.`
        : `Я прочитав(ла) правила розміщення спеціалістів (версія ${SPECIALIST_RULES_VERSION}) і зобов’язуюся їх дотримуватися.`;

  const privacyText =
    lang === "de"
      ? "Ich habe die Datenschutzerklärung zur Kenntnis genommen."
      : lang === "ru"
        ? "Я ознакомился(лась) с Политикой конфиденциальности."
        : "Я ознайомився(лась) з Політикою конфіденційності.";

  return (
    <div className="space-y-3 rounded-xl border border-gray-100 bg-gray-50/80 p-3">
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={b2bAccepted}
          onChange={(event) => onB2bChange(event.target.checked)}
          className="mt-1"
        />
        <span className="text-sm text-gray-700">
          {b2bText}
          <span className="mt-1 block text-xs text-gray-500">{b2bHint}</span>
        </span>
      </label>

      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={agbAccepted}
          onChange={(event) => onAgbChange(event.target.checked)}
          className="mt-1"
        />
        <span className="text-sm text-gray-700">
          {agbText}{" "}
          <Link href={agbHref} className="underline underline-offset-2" target="_blank">
            {legalLinkLabel(lang, "agb")}
          </Link>
        </span>
      </label>

      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={rulesAccepted}
          onChange={(event) => onRulesChange(event.target.checked)}
          className="mt-1"
        />
        <span className="text-sm text-gray-700">
          {rulesText}{" "}
          <Link href={rulesHref} className="underline underline-offset-2" target="_blank">
            {legalLinkLabel(lang, "rules")}
          </Link>
        </span>
      </label>

      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={privacyAcknowledged}
          onChange={(event) => onPrivacyChange(event.target.checked)}
          className="mt-1"
        />
        <span className="text-sm text-gray-700">
          {privacyText}{" "}
          <Link href={privacyHref} className="underline underline-offset-2" target="_blank">
            {legalLinkLabel(lang, "privacy")}
          </Link>
        </span>
      </label>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
