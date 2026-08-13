import {
  BookOpen,
  Briefcase,
  Cpu,
  FileText,
  Globe2,
  Heart,
  Home,
  Sparkles,
  Truck,
  type LucideIcon,
} from "lucide-react";

const SLUG_ICON: Record<string, LucideIcon> = {
  "legal-consulting": FileText,
  "health-psychology": Heart,
  "education-development": BookOpen,
  "tech-it-support": Cpu,
  "house-garden": Home,
  "business-consulting": Briefcase,
  "beauty-care": Sparkles,
  "moving-transport": Truck,
};

const FALLBACK_ICONS: LucideIcon[] = [FileText, Heart, BookOpen, Globe2, Home, Cpu];

function resolveIcon(slug: string, index: number): LucideIcon {
  const normalized = slug.toLowerCase();
  for (const [key, icon] of Object.entries(SLUG_ICON)) {
    if (normalized.includes(key) || normalized.startsWith(key.split("-")[0] ?? "")) {
      return icon;
    }
  }
  return FALLBACK_ICONS[index % FALLBACK_ICONS.length] ?? FileText;
}

export default function VariantBCategoryIcon({
  slug,
  index = 0,
}: {
  slug: string;
  index?: number;
}) {
  const Icon = resolveIcon(slug, index);

  return (
    <span
      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-freuly-primary-light"
      aria-hidden
    >
      <Icon className="h-5 w-5 text-freuly-primary" strokeWidth={1.75} />
    </span>
  );
}
