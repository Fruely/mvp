import Link from "next/link";
import { Globe, LayoutGrid, MapPin, Search } from "lucide-react";
import type { Lang } from "@/lib/i18n";
import type { AppShellCopy } from "@/lib/app-shell/copy";
import { homeHref, serviceSearchHref } from "@/lib/app-shell/links";

/**
 * Primary "find a specialist" action plus lightweight quick actions.
 * Nearby/Online deliberately route into the existing guided service-search
 * (they need a category + location, collected there) — no new search params.
 */
export default function AppShellActions({
  lang,
  copy,
}: {
  lang: Lang;
  copy: AppShellCopy;
}) {
  const serviceSearch = serviceSearchHref(lang);

  return (
    <section className="flex flex-col gap-4">
      <Link
        href={serviceSearch}
        className="flex flex-col gap-1 rounded-2xl bg-[#4B50E6] p-5 text-white transition-colors hover:bg-[#3F44C8]"
      >
        <span className="flex items-center gap-2 text-lg font-semibold">
          <Search className="h-5 w-5" aria-hidden />
          {copy.primaryActionCta}
        </span>
        <span className="text-sm text-white/85">{copy.primaryActionSubtitle}</span>
      </Link>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
          {copy.quickActionsTitle}
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <QuickAction href={serviceSearch} label={copy.nearby} Icon={MapPin} />
          <QuickAction href={serviceSearch} label={copy.online} Icon={Globe} />
          <QuickAction href={homeHref(lang)} label={copy.allCategories} Icon={LayoutGrid} />
        </div>
      </div>
    </section>
  );
}

function QuickAction({
  href,
  label,
  Icon,
}: {
  href: string;
  label: string;
  Icon: typeof MapPin;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-[52px] items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-900 transition-colors hover:border-[#4B50E6]/40 hover:bg-[#F4F6FF]"
    >
      <Icon className="h-5 w-5 text-[#4B50E6]" aria-hidden />
      {label}
    </Link>
  );
}
