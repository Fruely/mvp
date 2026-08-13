import type { HTMLAttributes } from "react";
import { cn } from "./utils";

export type BadgeVariant = "neutral" | "success" | "warning" | "error" | "info";

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

const variantClasses: Record<BadgeVariant, string> = {
  neutral: "border-freuly-border-default bg-freuly-border-subtle text-freuly-text-secondary",
  success: "border-freuly-success-border bg-freuly-success-light text-freuly-success",
  warning: "border-freuly-warning-border bg-freuly-warning-light text-freuly-warning",
  error: "border-freuly-error/20 bg-freuly-error-light text-freuly-error",
  info: "border-freuly-info/20 bg-freuly-info-light text-freuly-info",
};

export default function Badge({
  variant = "neutral",
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-freuly-pill border px-[10px] py-[4px] text-freuly-badge font-semibold",
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
