import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Briefcase,
  Cpu,
  FileText,
  Globe2,
  Heart,
  Home,
} from "lucide-react";

export function getHomeCategoryIcon(slug: string): LucideIcon {
  const normalized = slug.toLowerCase();

  if (
    normalized.includes("legal") ||
    normalized.includes("law") ||
    (normalized.includes("consulting") && normalized.includes("business"))
  ) {
    return FileText;
  }

  if (
    normalized.includes("health") ||
    normalized.includes("psych") ||
    normalized.includes("medical") ||
    normalized.includes("beauty")
  ) {
    return Heart;
  }

  if (
    normalized.includes("education") ||
    normalized.includes("tutor") ||
    normalized.includes("development")
  ) {
    return BookOpen;
  }

  if (
    normalized.includes("translation") ||
    normalized.includes("moving") ||
    normalized.includes("transport")
  ) {
    return Globe2;
  }

  if (normalized.includes("house") || normalized.includes("garden")) {
    return Home;
  }

  if (normalized.includes("tech") || normalized.includes("it")) {
    return Cpu;
  }

  return Briefcase;
}
