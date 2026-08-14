import FooterPrefetchLink from "@/components/FooterPrefetchLink";
import { Suspense } from "react";
import { t } from "@/lib/i18n";
import CookieSettingsLink from "@/components/consent/CookieSettingsLink";
import FooterLanguageSwitcher from "@/components/FooterLanguageSwitcher";

/**
 * @typedef {'ua'|'ru'|'de'} Lang
 * @typedef {import('@/lib/i18n').Dictionary} Dictionary
 *
 * @typedef {Object} FooterProps
 * @property {Lang} lang
 * @property {Dictionary} dict
 */

const linkClass =
  "text-sm text-freuly-text-secondary transition-colors hover:text-white";
const bottomLinkClass =
  "text-[13px] text-freuly-text-secondary transition-colors hover:text-white";

/**
 * @param {{ title: string, links: Array<{ href: string, label: string, external?: boolean }> }} props
 */
function FooterLinkColumn({ title, links }) {
  return (
    <div className="min-w-[5.5rem] shrink-0">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-white">{title}</h4>
      <ul className="mt-4 space-y-4">
        {links.map((item) => (
          <li key={item.href + item.label}>
            {item.external ? (
              <a href={item.href} className={linkClass}>
                {item.label}
              </a>
            ) : (
              <FooterPrefetchLink href={item.href} className={linkClass}>
                {item.label}
              </FooterPrefetchLink>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** @param {FooterProps} props */
export default function Footer(props) {
  const { dict, lang } = props;
  const prefix = lang ? `/${lang}` : "";
  const homeHref = lang ? `/${lang}` : "/";
  const year = new Date().getFullYear();

  const languageLabels = {
    ua: t(dict, "footer.language.ua"),
    ru: t(dict, "footer.language.ru"),
    de: t(dict, "footer.language.de"),
  };

  const platformLinks = [
    {
      href: `${prefix}/service-search`,
      label: t(dict, "footer.platform.findSpecialists"),
    },
    {
      href: `${prefix}`,
      label: t(dict, "footer.platform.howItWorks"),
    },
    {
      href: `${prefix}/specialist-rules`,
      label: t(dict, "footer.platform.trustAndSafety"),
    },
  ];

  const specialistLinks = [
    {
      href: `${prefix}/become-specialist`,
      label: t(dict, "footer.specialists.join"),
    },
    {
      href: `${prefix}/for-specialists`,
      label: t(dict, "footer.specialists.stories"),
    },
    {
      href: `${prefix}/partners`,
      label: t(dict, "footer.specialists.resources"),
    },
  ];

  const companyLinks = [
    {
      href: `${prefix}/about`,
      label: t(dict, "footer.company.about"),
    },
    {
      href: `${prefix}/support`,
      label: t(dict, "footer.company.contact"),
    },
    {
      href: `${prefix}/partners`,
      label: t(dict, "footer.company.partners"),
    },
  ];

  const bottomLinks = [
    {
      key: "privacy",
      href: `${prefix}/datenschutzerklaerung`,
      label: t(dict, "footer.privacyLink"),
    },
    {
      key: "terms",
      href: `${prefix}/agb`,
      label: t(dict, "footer.termsLink"),
    },
    {
      key: "impressum",
      href: `${prefix}/impressum`,
      label: t(dict, "footer.impressumLink"),
    },
  ];

  return (
    <footer className="border-t border-freuly-border-default bg-freuly-text-primary">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-10 px-4 pb-10 pt-10 sm:px-6 lg:gap-10 lg:px-16 lg:pb-12 lg:pt-14">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
          <div className="w-full max-w-[320px] shrink-0">
            <FooterPrefetchLink href={homeHref} className="inline-flex items-center gap-2.5">
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-freuly-primary text-base font-bold text-white">
                f
              </span>
              <span className="text-lg font-bold text-white">freuly</span>
            </FooterPrefetchLink>
            <p className="mt-4 text-sm leading-[1.6] text-freuly-text-secondary">
              {t(dict, "footer.tagline")}
            </p>
          </div>

          <div className="flex flex-wrap gap-10 sm:gap-12 lg:gap-20">
            <FooterLinkColumn
              title={t(dict, "footer.platformHeading")}
              links={platformLinks}
            />
            <FooterLinkColumn
              title={t(dict, "footer.specialistsHeading")}
              links={specialistLinks}
            />
            <FooterLinkColumn title={t(dict, "footer.companyHeading")} links={companyLinks} />
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="h-px w-full bg-freuly-border-default" aria-hidden />

          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <p className="text-[13px] text-freuly-text-secondary">
              © {year} Freuly. {t(dict, "footer.rights")}
            </p>

            <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-6">
              <div className="flex flex-wrap items-center gap-6">
                {bottomLinks.map((item) => (
                  <FooterPrefetchLink key={item.key} href={item.href} className={bottomLinkClass}>
                    {item.label}
                  </FooterPrefetchLink>
                ))}
                <CookieSettingsLink
                  label={t(dict, "footer.cookieSettings")}
                  className={bottomLinkClass}
                />
              </div>

              <Suspense fallback={null}>
                <FooterLanguageSwitcher lang={lang} labels={languageLabels} />
              </Suspense>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
