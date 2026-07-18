import Link from "next/link";
import {
  Briefcase,
  GraduationCap,
  HeartPulse,
  Home,
  Laptop,
  Scale,
  Sparkles,
  Truck,
  type LucideIcon,
} from "lucide-react";
import type { AppShellCategorySlug } from "@/lib/app-shell/copy";

/** Simple, uniform icons from the already-installed lucide-react. */
const CATEGORY_ICON: Record<AppShellCategorySlug, LucideIcon> = {
  "health-psychology": HeartPulse,
  "beauty-care": Sparkles,
  "house-garden": Home,
  "education-development": GraduationCap,
  "tech-it-support": Laptop,
  "legal-consulting": Scale,
  "business-consulting": Briefcase,
  "moving-transport": Truck,
};

/**
 * Very soft pastel tints — a balanced mix of warm (apricot, cream, sand, orange)
 * and cool (emerald, indigo, sky, rose) tones so the grid feels alive but stays
 * calm and readable. Full literal class strings so Tailwind JIT keeps them.
 */
const CATEGORY_STYLE: Record<
  AppShellCategorySlug,
  { tint: string; icon: string }
> = {
  "health-psychology": { tint: "border-[#D1FAE5] bg-[#ECFDF5]", icon: "text-[#059669]" },
  "beauty-care": { tint: "border-[#FBD7E4] bg-[#FEF1F5]", icon: "text-[#DB2777]" },
  "house-garden": { tint: "border-[#FCE0C8] bg-[#FFF1E6]", icon: "text-[#EA7317]" },
  "education-development": { tint: "border-[#DDE1FF] bg-[#EEF1FF]", icon: "text-[#4B50E6]" },
  "tech-it-support": { tint: "border-[#CFE9FB] bg-[#EAF6FF]", icon: "text-[#0284C7]" },
  "legal-consulting": { tint: "border-[#EFE3CC] bg-[#FAF5EC]", icon: "text-[#B45309]" },
  "business-consulting": { tint: "border-[#F7ECC0] bg-[#FEF7E0]", icon: "text-[#CA8A04]" },
  "moving-transport": { tint: "border-[#FBD9C9] bg-[#FFF0EA]", icon: "text-[#F97316]" },
};

export type AppShellCategory = {
  slug: AppShellCategorySlug;
  label: string;
  href: string;
};

export default function AppShellCategoryGrid({
  title,
  categories,
}: {
  title: string;
  categories: AppShellCategory[];
}) {
  return (
    <section aria-label={title}>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
        {title}
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {categories.map((category) => {
          const Icon = CATEGORY_ICON[category.slug];
          const style = CATEGORY_STYLE[category.slug];
          return (
            <Link
              key={category.slug}
              href={category.href}
              className={`flex min-h-[104px] flex-col items-start justify-between rounded-2xl border p-3.5 transition-transform hover:-translate-y-0.5 ${style.tint}`}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/75 shadow-sm">
                <Icon className={`h-5 w-5 ${style.icon}`} aria-hidden />
              </span>
              <span className="text-sm font-medium leading-snug text-gray-900">
                {category.label}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
