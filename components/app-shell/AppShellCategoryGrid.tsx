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
          return (
            <Link
              key={category.slug}
              href={category.href}
              className="flex min-h-[96px] flex-col items-start justify-between rounded-2xl border border-gray-200 bg-white p-4 transition-colors hover:border-[#4B50E6]/40 hover:bg-[#F4F6FF]"
            >
              <Icon className="h-6 w-6 text-[#4B50E6]" aria-hidden />
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
