import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "./utils";

export type ButtonVariant = "primary" | "secondary" | "outlinePrimary" | "strong" | "ghost" | "destructive";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-freuly-primary text-freuly-text-on-primary hover:bg-freuly-primary-hover disabled:hover:bg-freuly-primary",
  secondary:
    "border border-freuly-border-default bg-freuly-surface text-freuly-text-secondary hover:bg-freuly-border-subtle disabled:hover:bg-freuly-surface",
  outlinePrimary:
    "border border-freuly-primary bg-freuly-surface text-freuly-primary hover:bg-freuly-primary-light disabled:hover:bg-freuly-surface",
  strong:
    "bg-freuly-text-primary text-freuly-text-on-primary hover:bg-freuly-text-primary/90 disabled:hover:bg-freuly-text-primary",
  ghost:
    "bg-transparent text-freuly-text-secondary hover:bg-freuly-border-subtle hover:text-freuly-text-primary disabled:hover:bg-transparent",
  destructive:
    "bg-freuly-error text-freuly-text-on-primary hover:bg-freuly-error/90 disabled:hover:bg-freuly-error",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", className, type = "button", disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled}
      className={cn(
        "inline-flex min-h-[37px] items-center justify-center gap-2 rounded-freuly-button px-freuly-4 py-[10px] text-freuly-button transition-colors",
        "freuly-focus-ring disabled:cursor-not-allowed disabled:opacity-50",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
});

export default Button;
