import { cookies } from "next/headers";
import Link from "next/link";
import { isSupportedLang, type Lang } from "@/lib/i18n";
import { INSTALL_SHARED_COPY, landingHeroMessage } from "@/lib/pwa/installCopy";
import { parseAudience, preserveUtmParams } from "@/lib/pwa/installLogic";
import { loginHref, serviceSearchHref } from "@/lib/app-shell/links";
import InstallFreuly from "@/components/pwa/InstallFreuly";
import AppShellHeader from "@/components/app-shell/AppShellHeader";

const LANG_COOKIE = "freuly_lang";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Freuly — Install",
  robots: {
    index: false,
    follow: false,
  },
};

function resolveLang(): Lang {
  const cookieLang = cookies().get(LANG_COOKIE)?.value;
  return cookieLang && isSupportedLang(cookieLang) ? cookieLang : "ua";
}

function firstString(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export default function AppInstallPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const lang = resolveLang();
  const shared = INSTALL_SHARED_COPY[lang];
  const audienceRaw = firstString(searchParams.audience) ?? null;
  const audience = parseAudience(audienceRaw);
  const hero = landingHeroMessage(lang, audience);

  const source =
    firstString(searchParams.utm_source) ?? firstString(searchParams.source);
  const medium = firstString(searchParams.utm_medium);
  const campaign =
    firstString(searchParams.utm_campaign) ?? firstString(searchParams.campaign);
  const content = firstString(searchParams.utm_content);

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === "string") params.set(key, value);
  }
  const utmSuffix = preserveUtmParams(params);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col bg-gradient-to-b from-[#EEF1FF] via-white to-[#FFF6EC]">
      <AppShellHeader
        lang={lang}
        languageSwitcherLabel={lang === "de" ? "Sprache" : lang === "ua" ? "Мова" : "Язык"}
      />

      <main className="flex flex-1 flex-col gap-6 px-4 py-6">
        <section className="rounded-3xl bg-gradient-to-br from-[#4B50E6] via-[#5A5FEF] to-[#7A5CF0] p-6 text-white">
          <h1 className="text-2xl font-bold leading-tight">{hero.title}</h1>
          <p className="mt-2 text-sm text-white/85">{hero.body}</p>
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

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href={`${serviceSearchHref(lang)}${utmSuffix}`}
            className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-xl bg-white px-4 py-3 text-sm font-semibold text-[#3B3FBF] ring-1 ring-[#DDE1FF] transition hover:bg-[#F7F8FF]"
          >
            {shared.openSearch}
          </Link>
          <Link
            href={loginHref}
            className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-xl bg-[#FFF7ED] px-4 py-3 text-sm font-semibold text-gray-900 ring-1 ring-[#F3C79C] transition hover:bg-[#FFF0E4]"
          >
            {shared.openCabinet}
          </Link>
        </div>
      </main>
    </div>
  );
}
