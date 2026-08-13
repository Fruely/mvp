import {
  Award,
  Cpu,
  Globe2,
  HousePlug,
  Scale,
  Stethoscope,
  type LucideIcon,
} from "lucide-react";

const SLUG_ICON: Record<string, LucideIcon> = {
  "legal-consulting": Scale,
  "health-psychology": Stethoscope,
  "education-development": Award,
  "tech-it-support": Cpu,
  "house-garden": HousePlug,
  "business-consulting": Scale,
  "beauty-care": Award,
  "moving-transport": HousePlug,
};

const FALLBACK_ICONS: LucideIcon[] = [Scale, Stethoscope, Award, Globe2, HousePlug, Cpu];

function resolveIcon(slug: string, index: number): LucideIcon {
  const normalized = slug.toLowerCase();
  for (const [key, icon] of Object.entries(SLUG_ICON)) {
    if (normalized.includes(key) || normalized.startsWith(key.split("-")[0] ?? "")) {
      return icon;
    }
  }
  return FALLBACK_ICONS[index % FALLBACK_ICONS.length] ?? Scale;
}

export default function VariantCCategoryIcon({
  slug,
  index = 0,
}: {
  slug: string;
  index?: number;
}) {
  const Icon = resolveIcon(slug, index);

  return (
    <span
      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#eaf6f5]"
      aria-hidden
    >
      <Icon className="h-5 w-5 text-freuly-primary" strokeWidth={1.75} />
    </span>
  );
}
