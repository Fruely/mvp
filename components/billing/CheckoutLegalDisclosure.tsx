import type { LegalPublicLang } from "@/content/legal/types";
import {
  getCheckoutDisclosureText,
  type CheckoutPlanCode,
} from "@/content/legal/checkoutCopyClient";
import { agbPath, privacyPath } from "@/lib/legal/paths";
import Link from "next/link";

type Props = {
  lang: LegalPublicLang;
  planCode: CheckoutPlanCode;
};

export default function CheckoutLegalDisclosure({ lang, planCode }: Props) {
  const text = getCheckoutDisclosureText(lang, planCode);

  const linksLabel =
    lang === "de"
      ? "Rechtliche Hinweise:"
      : lang === "ru"
        ? "Правовые документы:"
        : "Правові документи:";

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs leading-relaxed text-gray-700">
      <p className="whitespace-pre-line">{text}</p>
      <p className="mt-2">
        {linksLabel}{" "}
        <Link href={agbPath(lang)} className="underline underline-offset-2" target="_blank">
          AGB
        </Link>
        {" · "}
        <Link href={privacyPath(lang)} className="underline underline-offset-2" target="_blank">
          {lang === "de" ? "Datenschutz" : lang === "ru" ? "Datenschutz" : "Datenschutz"}
        </Link>
      </p>
    </div>
  );
}
