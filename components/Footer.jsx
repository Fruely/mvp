import Link from "next/link";
import { t } from "@/lib/i18n";

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
    <footer className="bg-slate-900 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 py-10 flex flex-col md:flex-row justify-between items-start gap-6">
        <div>
          <Link href={homeHref} className="text-2xl font-bold text-blue-300">
            FREULY
          </Link>
          <div className="text-sm text-slate-300 mt-2 max-w-sm">
            {t(dict, "footer.tagline")}
          </div>
        </div>

        <div className="flex gap-10">
          <div>
            <h4 className="font-semibold mb-2 text-slate-100">{t(dict, "footer.companyHeading")}</h4>
            <ul className="text-sm text-slate-300 space-y-1">
              <li>
                <Link href={`${prefix}/about`} className="hover:text-blue-300">
                  {t(dict, "footer.about")}
                </Link>
              </li>
              <li>
                <Link href={`${prefix}/support`} className="hover:text-blue-300">
                  {t(dict, "footer.support")}
                </Link>
              </li>
              <li>
                <Link href={`${prefix}/become-specialist`} className="hover:text-blue-300">
                  {t(dict, "footer.forSpecialists")}
                </Link>
              </li>
              <li>
                <Link href="/impressum" className="hover:text-blue-300">
                  Impressum
                </Link>
              </li>
              <li>
                <Link href="/datenschutzerklaerung" className="hover:text-blue-300">
                  Datenschutzerklärung
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-2 text-slate-100">{t(dict, "footer.contacts")}</h4>
            <p className="text-sm text-slate-300">info@freuly.de</p>
          </div>
        </div>
      </div>

      <div className="text-center text-xs text-slate-400 py-4 border-t border-slate-800">
        © 2025 Freuly. {t(dict, "footer.rights")}
      </div>
    </footer>
  );
}
