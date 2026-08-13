import type { ReactNode } from "react";
import { cn } from "@/components/ui";

type DashboardPageHeaderProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  kicker?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export default function DashboardPageHeader({
  title,
  subtitle,
  kicker,
  actions,
  className,
}: DashboardPageHeaderProps) {
  return (
    <header className={cn("flex flex-col gap-freuly-4 sm:flex-row sm:items-start sm:justify-between", className)}>
      <div className="min-w-0 space-y-1.5">
        {kicker ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-freuly-primary">
            {kicker}
          </p>
        ) : null}
        <h1 className="text-freuly-page-title text-freuly-text-primary">{title}</h1>
        {subtitle ? (
          <p className="max-w-3xl text-freuly-page-subtitle text-freuly-text-secondary">{subtitle}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-freuly-3">{actions}</div> : null}
    </header>
  );
}
