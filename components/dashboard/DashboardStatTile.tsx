import type { ReactNode } from "react";
import { cn } from "@/components/ui";

type DashboardStatTileProps = {
  label: ReactNode;
  value: ReactNode;
  className?: string;
};

export default function DashboardStatTile({ label, value, className }: DashboardStatTileProps) {
  return (
    <div
      className={cn(
        "rounded-freuly-md border border-freuly-border-subtle bg-freuly-border-subtle/40 p-freuly-4",
        className,
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-freuly-text-muted">{label}</p>
      <div className="mt-freuly-2 text-freuly-body text-freuly-text-primary">{value}</div>
    </div>
  );
}
