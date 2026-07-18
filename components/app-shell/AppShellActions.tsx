import Link from "next/link";
import { Globe, LayoutGrid, MapPin, type LucideIcon } from "lucide-react";
import type { Lang } from "@/lib/i18n";
import type { AppShellCopy } from "@/lib/app-shell/copy";
import { homeHref, serviceSearchHref } from "@/lib/app-shell/links";

/**
 * Lightweight quick actions (second level of hierarchy, below the hero CTA).
 * Nearby/Online deliberately route into the existing guided service-search
 * (they need a category + location, collected there) — no new search params.
 * Compact, app-like tiles with soft warm/cool tints for a friendlier feel.
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
    <section aria-label={copy.quickActionsTitle}>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
        {copy.quickActionsTitle}
      </h2>
      <div className="grid grid-cols-3 gap-3">
        <QuickAction
          href={serviceSearch}
          label={copy.nearby}
          Icon={MapPin}
          tint="bg-[#FFF1E6]"
          iconColor="text-[#EA7317]"
        />
        <QuickAction
          href={serviceSearch}
          label={copy.online}
          Icon={Globe}
          tint="bg-[#EAF2FF]"
          iconColor="text-[#4B50E6]"
        />
        <QuickAction
          href={homeHref(lang)}
          label={copy.allCategories}
          Icon={LayoutGrid}
          tint="bg-[#FEF7E0]"
          iconColor="text-[#CA8A04]"
        />
      </div>
    </section>
  );
}

function QuickAction({
  href,
  label,
  Icon,
  tint,
  iconColor,
}: {
  href: string;
  label: string;
  Icon: LucideIcon;
  tint: string;
  iconColor: string;
}) {
  return (
    <Link
      href={href}
      className={`flex min-h-[96px] flex-col items-center justify-center gap-2 rounded-2xl border border-black/[0.04] px-2 py-3 text-center transition-transform hover:-translate-y-0.5 ${tint}`}
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/75 shadow-sm">
        <Icon className={`h-5 w-5 ${iconColor}`} aria-hidden />
      </span>
      <span className="text-xs font-medium leading-tight text-gray-900 sm:text-sm">
        {label}
      </span>
    </Link>
  );
}
