import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "./utils";

export type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & {
  id: string;
  label?: string;
  helperText?: string;
  error?: string;
  containerClassName?: string;
};

const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    id,
    label,
    helperText,
    error,
    className,
    containerClassName,
    disabled,
    ...props
  },
  ref,
) {
  const describedBy = error ? `${id}-error` : helperText ? `${id}-helper` : undefined;

  return (
    <div className={cn("w-full", containerClassName)}>
      {label ? (
        <label htmlFor={id} className="mb-freuly-2 block text-freuly-label text-freuly-text-primary">
          {label}
        </label>
      ) : null}
      <input
        ref={ref}
        id={id}
        disabled={disabled}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={describedBy}
        className={cn(
          "freuly-focus-ring w-full rounded-freuly-md border bg-freuly-surface px-freuly-3 py-freuly-2 text-freuly-body text-freuly-text-primary",
          "placeholder:text-freuly-text-muted disabled:cursor-not-allowed disabled:bg-freuly-border-subtle disabled:text-freuly-text-muted",
          error
            ? "border-freuly-error focus-visible:ring-freuly-error/25"
            : "border-freuly-border-default hover:border-freuly-text-muted/40",
          className,
        )}
        {...props}
      />
      {error ? (
        <p id={`${id}-error`} className="mt-freuly-2 text-freuly-helper text-freuly-error" role="alert">
          {error}
        </p>
      ) : helperText ? (
        <p id={`${id}-helper`} className="mt-freuly-2 text-freuly-helper text-freuly-text-muted">
          {helperText}
        </p>
      ) : null}
    </div>
  );
});

export default Input;
