import FreulyLogo from "@/components/brand/FreulyLogo";
import { SUPPORTED_LANGS, type Lang } from "@/lib/i18n";
import { languageSwitchHref } from "@/lib/app-shell/links";

const LANG_LABEL: Record<Lang, string> = {
  ua: "UA",
  ru: "RU",
  de: "DE",
};

/**
 * Compact, app-shell-only header. Intentionally NOT the marketing Header —
 * just a text logo and a language switcher that swaps the `freuly_lang` cookie
 * while keeping the user on /app.
 *
 * Language chips use plain <a> (not next/link): the target is an API route that
 * Set-Cookies + 307 redirects. Client-side Link navigation can skip the cookie
 * write and leave the shell language unchanged.
 */
export default function AppShellHeader({
  lang,
  languageSwitcherLabel,
}: {
  lang: Lang;
  languageSwitcherLabel: string;
}) {
  return (
    <header className="flex items-center justify-between gap-4 border-b border-black/[0.04] px-4 py-3">
      <FreulyLogo className="h-9 w-auto" priority />
      <nav aria-label={languageSwitcherLabel} className="flex items-center gap-1">
        {SUPPORTED_LANGS.map((option) => {
          const active = option === lang;
          return (
            <a
              key={option}
              href={languageSwitchHref(option)}
              aria-current={active ? "true" : undefined}
              className={`min-h-[40px] min-w-[40px] rounded-lg px-2.5 py-2 text-center text-sm font-semibold transition-colors ${
                active
                  ? "bg-[#4B50E6] text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {LANG_LABEL[option]}
            </a>
          );
        })}
      </nav>
    </header>
  );
}
