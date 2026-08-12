import { forwardRef, type SelectHTMLAttributes } from "react";
import { cn } from "./utils";

export type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

export type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "id"> & {
  id: string;
  label?: string;
  helperText?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
  containerClassName?: string;
};

const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  {
    id,
    label,
    helperText,
    error,
    options,
    placeholder,
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
      <div className="relative">
        <select
          ref={ref}
          id={id}
          disabled={disabled}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={describedBy}
          className={cn(
            "freuly-focus-ring w-full appearance-none rounded-freuly-md border bg-freuly-surface px-freuly-3 py-freuly-2 pr-freuly-8 text-freuly-body text-freuly-text-primary",
            "disabled:cursor-not-allowed disabled:bg-freuly-border-subtle disabled:text-freuly-text-muted",
            error
              ? "border-freuly-error focus-visible:ring-freuly-error/25"
              : "border-freuly-border-default hover:border-freuly-text-muted/40",
            className,
          )}
          {...props}
        >
          {placeholder ? (
            <option value="" disabled>
              {placeholder}
            </option>
          ) : null}
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
        <span
          aria-hidden
          className="pointer-events-none absolute right-freuly-3 top-1/2 -translate-y-1/2 text-freuly-text-muted"
        >
          ▾
        </span>
      </div>
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

export default Select;
