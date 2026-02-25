"use client";

import * as React from "react";

type MobileStickyCTAProps = {
  label: string;
  onClick: () => void;
  /** Hide bar when form/modal is open */
  isHidden?: boolean;
};

export default function MobileStickyCTA({
  label,
  onClick,
  isHidden,
}: MobileStickyCTAProps) {
  if (isHidden) return null;

  return (
    <div
      className="
        md:hidden
        fixed left-0 right-0 bottom-0
        z-50
        border-t border-gray-200
        bg-white/95 backdrop-blur
      "
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="px-3 pt-3 pb-3">
        <button
          type="button"
          onClick={onClick}
          className="
            w-full h-14
            rounded-xl
            bg-blue-600 hover:bg-blue-700
            text-white font-semibold
            shadow-md
            active:scale-[0.98]
            transition
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          "
          aria-label={label}
        >
          {label}
        </button>
      </div>
    </div>
  );
}
