import Link from "next/link";
import { LayoutDashboard, LogIn } from "lucide-react";
import type { Lang } from "@/lib/i18n";
import type { AppShellCopy } from "@/lib/app-shell/copy";
import { dashboardHref, loginHref } from "@/lib/app-shell/links";

/**
 * Specialist entry block. `isSpecialist` is resolved server-side from the
 * existing Supabase session (no client auth, no forced login for clients).
 * Regular clients simply keep using search without registering.
 *
 * Styled as a distinct warm-tinted accent card so it reads as its own section
 * rather than another neutral action card — without dominating the screen.
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
    <section className="rounded-2xl border border-[#FBD9C9] bg-gradient-to-br from-[#FFF7ED] to-[#FFF0E4] p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-[#B45309]">
        {copy.specialistTitle}
      </h2>
      {isSpecialist ? (
        <Link
          href={dashboardHref(lang)}
          className="mt-3 inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-[#4B50E6] px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#3F44C8]"
        >
          <LayoutDashboard className="h-5 w-5" aria-hidden />
          {copy.specialistCabinetCta}
        </Link>
      ) : (
        <>
          <p className="mt-1 text-sm text-gray-700">{copy.guestSpecialistHint}</p>
          <Link
            href={loginHref}
            className="mt-3 inline-flex min-h-[48px] items-center gap-2 rounded-xl border border-[#F3C79C] bg-white px-5 py-3 text-sm font-semibold text-gray-900 shadow-sm transition-colors hover:bg-[#FFF7ED]"
          >
            <LogIn className="h-5 w-5" aria-hidden />
            {copy.guestSpecialistCta}
          </Link>
        </>
      )}
    </section>
  );
}
