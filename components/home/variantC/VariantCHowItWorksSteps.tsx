import { Mail, Search, Users } from "lucide-react";
import type { Dictionary } from "@/lib/i18n";
import { t } from "@/lib/i18n";

const STEPS = [
  {
    number: 1,
    icon: Search,
    titleKey: "home.variantC.howItWorks.step1.title",
    bodyKey: "home.variantC.howItWorks.step1.description",
  },
  {
    number: 2,
    icon: Users,
    titleKey: "home.variantC.howItWorks.step2.title",
    bodyKey: "home.variantC.howItWorks.step2.description",
  },
  {
    number: 3,
    icon: Mail,
    titleKey: "home.variantC.howItWorks.step3.title",
    bodyKey: "home.variantC.howItWorks.step3.description",
  },
] as const;

export default function VariantCHowItWorksSteps({ dict }: { dict: Dictionary }) {
  return (
    <div className="grid gap-10 md:grid-cols-3 md:gap-12">
      {STEPS.map(({ number, icon: Icon, titleKey, bodyKey }) => (
        <div key={number} className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="inline-flex h-8 w-9 items-center justify-center rounded-md bg-freuly-primary text-base font-bold text-freuly-text-on-primary">
              {number}
            </span>
            <Icon className="h-6 w-6 text-freuly-primary" strokeWidth={1.75} aria-hidden />
          </div>
          <div className="space-y-2">
            <p className="text-lg font-semibold text-freuly-text-primary">{t(dict, titleKey)}</p>
            <p className="text-sm leading-relaxed text-freuly-text-secondary">{t(dict, bodyKey)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
