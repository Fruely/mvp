import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "./utils";

export type TextareaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id"> & {
  id: string;
  label?: string;
  helperText?: string;
  error?: string;
  containerClassName?: string;
};

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  {
    id,
    label,
    helperText,
    error,
    className,
    containerClassName,
    disabled,
    rows = 4,
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
      <textarea
        ref={ref}
        id={id}
        rows={rows}
        disabled={disabled}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={describedBy}
        className={cn(
          "freuly-focus-ring w-full resize-y rounded-freuly-md border bg-freuly-surface px-freuly-3 py-freuly-2 text-freuly-body text-freuly-text-primary",
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

export default Textarea;
