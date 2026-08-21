import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

type ProPrimaryButtonProps = {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  className?: string;
  fullWidthMobile?: boolean;
};

export default function ProPrimaryButton({
  children,
  onClick,
  type = "button",
  className = "",
  fullWidthMobile = false,
}: ProPrimaryButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-full bg-freuly-primary px-5 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-freuly-primary-hover freuly-focus-ring md:px-7 md:py-3.5 ${
        fullWidthMobile ? "w-full md:w-auto" : ""
      } ${className}`}
    >
      {children}
      <ChevronRight className="size-3.5 shrink-0" aria-hidden />
    </button>
  );
}
