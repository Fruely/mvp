import type { Lang } from "@/lib/i18n";
import { INSTALL_SHARED_COPY } from "@/lib/pwa/installCopy";

/** Static install instructions — Safari, Chrome iOS, and Android fallback. */
export default function InstallGuide({ lang }: { lang: Lang }) {
  const shared = INSTALL_SHARED_COPY[lang];

  return (
    <section
      id="install-guide"
      aria-labelledby="install-guide-title"
      className="min-w-0 rounded-2xl border border-orange-100 bg-white p-5 shadow-sm"
    >
      <h2 id="install-guide-title" className="text-lg font-semibold text-gray-900">
        {shared.guideTitle}
      </h2>

      <div className="mt-5 space-y-6">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-orange-700">{shared.safariHeading}</h3>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-gray-700">
            <li className="break-words">{shared.safariStepShare}</li>
            <li className="break-words">{shared.safariStepHome}</li>
            <li className="break-words">{shared.safariStepAdd}</li>
          </ol>
        </div>

        <div className="min-w-0 border-t border-gray-100 pt-5">
          <h3 className="text-sm font-semibold text-orange-700">{shared.chromeHeading}</h3>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-gray-700">
            <li className="break-words">{shared.chromeStepShare}</li>
            <li className="break-words">{shared.chromeStepMore}</li>
            <li className="break-words">{shared.chromeStepHome}</li>
            <li className="break-words">{shared.chromeStepAdd}</li>
          </ol>
        </div>

        <div className="min-w-0 border-t border-gray-100 pt-5">
          <h3 className="text-sm font-semibold text-orange-700">{shared.androidHeading}</h3>
          <p className="mt-2 text-sm leading-relaxed text-gray-700">{shared.androidHint}</p>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">{shared.androidFallback}</p>
        </div>
      </div>
    </section>
  );
}
