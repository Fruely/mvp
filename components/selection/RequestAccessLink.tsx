import Link from "next/link";
import type { Lang } from "@/lib/i18n";

const COPY: Record<Lang, { save: string; open: string }> = {
  ru: {
    save: "Сохраните ссылку, чтобы вернуться к заявке и выбрать специалиста.",
    open: "Открыть заявку",
  },
  ua: {
    save: "Збережіть посилання, щоб повернутися до заявки і обрати спеціаліста.",
    open: "Відкрити заявку",
  },
  de: {
    save: "Speichern Sie den Link, um zur Anfrage zurückzukehren und eine Fachkraft zu wählen.",
    open: "Anfrage öffnen",
  },
};

export default function RequestAccessLink({ lang, token }: { lang: Lang; token: string }) {
  const copy = COPY[lang];
  const href = `/${lang}/requests/access?token=${encodeURIComponent(token)}`;
  return (
    <div className="mx-auto mt-6 max-w-xl rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
      <p>{copy.save}</p>
      <Link href={href} className="mt-2 inline-flex font-semibold text-emerald-800">
        {copy.open}
      </Link>
    </div>
  );
}
