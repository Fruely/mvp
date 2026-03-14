import Link from "next/link";
import { t } from "@/lib/i18n";
import FreulySocialIcons from "./FreulySocialIcons";

/**
 * @typedef {'ua'|'ru'|'de'} Lang
 * @typedef {import('@/lib/i18n').Dictionary} Dictionary
 *
 * @typedef {Object} FooterProps
 * @property {Lang} lang
 * @property {Dictionary} dict
 */

/** @param {FooterProps} props */
export default function Footer(props) {
  const { dict, lang } = props;
  const prefix = lang ? `/${lang}` : "";
  const homeHref = lang ? `/${lang}` : "/";

  return (
    <footer className="bg-[#2C2F5A] border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 py-10 flex flex-col md:flex-row justify-between items-start gap-6">
        <div>
          <Link href={homeHref} className="text-2xl font-bold text-white/90">
            FREULY
          </Link>
          <div className="text-sm text-white/50 mt-2 max-w-sm">
            {t(dict, "footer.tagline")}
          </div>
          <div className="mt-8">
            <h4 className="font-semibold mb-2 text-white/90">Мы в соцсетях</h4>
            <FreulySocialIcons />
          </div>
        </div>

        <div className="flex gap-10">
          <div>
            <h4 className="font-semibold mb-2 text-white/90">{t(dict, "footer.companyHeading")}</h4>
            <ul className="text-sm text-white/70 space-y-1">
              <li>
                <Link href={`${prefix}/about`} className="hover:text-white">
                  {t(dict, "footer.about")}
                </Link>
              </li>
              <li>
                <Link href={`${prefix}/support`} className="hover:text-white">
                  {t(dict, "footer.support")}
                </Link>
              </li>
              <li>
                <Link href={`${prefix}/become-specialist`} className="hover:text-white">
                  {t(dict, "footer.forSpecialists")}
                </Link>
              </li>
              <li>
                <Link href="/impressum" className="hover:text-white">
                  Impressum
                </Link>
              </li>
              <li>
                <Link href="/datenschutzerklaerung" className="hover:text-white">
                  Datenschutzerklärung
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-2 text-white/90">{t(dict, "footer.contacts")}</h4>
            <p className="text-sm text-white/70">info@freuly.de</p>
          </div>
        </div>
      </div>

      <div className="text-center text-xs text-white/50 py-4 border-t border-white/10">
        © 2025 Freuly. {t(dict, "footer.rights")}
      </div>
    </footer>
  );
}
