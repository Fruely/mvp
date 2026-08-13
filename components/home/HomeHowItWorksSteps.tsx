import { Mail, Search, Users } from "lucide-react";
import type { Dictionary } from "@/lib/i18n";
import { t } from "@/lib/i18n";

const STEPS = [
  { number: 1, icon: Search, titleKey: "home.howItWorks.step1Title", descKey: "home.howItWorks.step1Desc" },
  { number: 2, icon: Users, titleKey: "home.howItWorks.step2Title", descKey: "home.howItWorks.step2Desc" },
  { number: 3, icon: Mail, titleKey: "home.howItWorks.step3Title", descKey: "home.howItWorks.step3Desc" },
] as const;

type HomeHowItWorksStepsProps = {
  dict: Dictionary;
};

export default function HomeHowItWorksSteps({ dict }: HomeHowItWorksStepsProps) {
  return (
    <div className="grid gap-8 md:grid-cols-3 md:gap-12">
      {STEPS.map(({ number, icon: Icon, titleKey, descKey }) => (
        <div key={number} className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex h-8 w-9 items-center justify-center rounded-freuly-button bg-freuly-primary text-base font-bold text-freuly-text-on-primary">
              {number}
            </span>
            <Icon className="size-6 text-freuly-primary" aria-hidden />
          </div>
          <div className="space-y-2">
            <p className="text-lg font-semibold text-freuly-text-primary">{t(dict, titleKey)}</p>
            <p className="text-sm leading-relaxed text-freuly-text-secondary">{t(dict, descKey)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
