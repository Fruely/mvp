import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "./utils";

export type AlertVariant = "info" | "success" | "warning" | "error";

export type AlertProps = HTMLAttributes<HTMLDivElement> & {
  variant?: AlertVariant;
  title?: ReactNode;
};

const variantClasses: Record<AlertVariant, string> = {
  info: "border-freuly-info/20 bg-freuly-info-light text-freuly-text-primary",
  success: "border-freuly-success/20 bg-freuly-success-light text-freuly-text-primary",
  warning: "border-freuly-warning/20 bg-freuly-warning-light text-freuly-text-primary",
  error: "border-freuly-error/20 bg-freuly-error-light text-freuly-text-primary",
};

export default function Alert({
  variant = "info",
  title,
  className,
  children,
  role = "status",
  ...props
}: AlertProps) {
  return (
    <div
      role={role}
      className={cn(
        "rounded-freuly-md border px-freuly-4 py-freuly-3 text-freuly-body-sm",
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {title ? <p className="mb-freuly-1 text-freuly-label text-freuly-text-primary">{title}</p> : null}
      {children ? <div className="text-freuly-body-sm text-freuly-text-secondary">{children}</div> : null}
    </div>
  );
}
