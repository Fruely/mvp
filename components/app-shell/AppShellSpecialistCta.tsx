import Link from "next/link";
import { LayoutDashboard, LogIn } from "lucide-react";
import type { Lang } from "@/lib/i18n";
import type { AppShellCopy } from "@/lib/app-shell/copy";
import { dashboardHref, loginHref } from "@/lib/app-shell/links";

/**
 * Specialist entry block. `isSpecialist` is resolved server-side from the
 * existing Supabase session (no client auth, no forced login for clients).
 * Regular clients simply keep using search without registering.
 */
export default function AppShellSpecialistCta({
  lang,
  copy,
  isSpecialist,
}: {
  lang: Lang;
  copy: AppShellCopy;
  isSpecialist: boolean;
}) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
        {copy.specialistTitle}
      </h2>
      {isSpecialist ? (
        <Link
          href={dashboardHref(lang)}
          className="mt-3 inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-gray-800"
        >
          <LayoutDashboard className="h-5 w-5" aria-hidden />
          {copy.specialistCabinetCta}
        </Link>
      ) : (
        <>
          <p className="mt-1 text-sm text-gray-600">{copy.guestSpecialistHint}</p>
          <Link
            href={loginHref}
            className="mt-3 inline-flex min-h-[48px] items-center gap-2 rounded-xl border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-900 transition-colors hover:bg-gray-50"
          >
            <LogIn className="h-5 w-5" aria-hidden />
            {copy.guestSpecialistCta}
          </Link>
        </>
      )}
    </section>
  );
}
