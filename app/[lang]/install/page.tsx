import Link from "next/link";
import { redirect } from "next/navigation";
import { isSupportedLang, type Lang } from "@/lib/i18n";
import { INSTALL_SHARED_COPY, landingHeroMessage } from "@/lib/pwa/installCopy";
import { parseAudience, preserveUtmParams } from "@/lib/pwa/installLogic";
import { loginHref, serviceSearchHref } from "@/lib/app-shell/links";
import InstallFreuly from "@/components/pwa/InstallFreuly";
import InstallGuide from "@/components/pwa/InstallGuide";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Freuly — Install",
  robots: {
    index: false,
    follow: false,
  },
};

function firstString(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export default function LangInstallPage({
  params,
  searchParams,
}: {
  params: { lang: string };
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  if (!isSupportedLang(params.lang)) {
    redirect("/ua/install");
  }

  const lang = params.lang as Lang;
  const shared = INSTALL_SHARED_COPY[lang];
  const audience = parseAudience(firstString(searchParams.audience) ?? null);
  const hero = landingHeroMessage(lang, audience);

  const source =
    firstString(searchParams.utm_source) ?? firstString(searchParams.source);
  const medium = firstString(searchParams.utm_medium);
  const campaign =
    firstString(searchParams.utm_campaign) ?? firstString(searchParams.campaign);
  const content = firstString(searchParams.utm_content);

  const paramsQs = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === "string") paramsQs.set(key, value);
  }
  const utmSuffix = preserveUtmParams(paramsQs);

  return (
    <div className="mx-auto flex w-full max-w-2xl min-w-0 flex-col px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <main className="flex min-w-0 flex-1 flex-col gap-6">
        <section className="rounded-3xl bg-gradient-to-br from-orange-500 via-orange-600 to-amber-600 p-6 text-white">
          <h1 className="text-2xl font-bold leading-tight break-words">{hero.title}</h1>
          <p className="mt-2 text-sm text-white/90 break-words">{hero.body}</p>
        </section>

        <InstallFreuly
          lang={lang}
          audience={audience}
          placement="install_page"
          variant="landing"
          source={source}
          medium={medium}
          campaign={campaign}
          content={content}
        />

        <InstallGuide lang={lang} />

        <div className="flex min-w-0 flex-col gap-3 sm:flex-row">
          <Link
            href={`${serviceSearchHref(lang)}${utmSuffix}`}
            className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            {shared.openSearch}
          </Link>
          <Link
            href={loginHref}
            className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
          >
            {shared.openCabinet}
          </Link>
        </div>
      </main>
    </div>
  );
}
