"use client";

import { useEffect, useCallback } from "react";

type Props = {
  urls: string[];
  activeIndex: number | null;
  onClose: () => void;
  onGoPrev: () => void;
  onGoNext: () => void;
  ariaLabel: string;
};

export default function SpecialistDocumentsLightbox({
  urls,
  activeIndex,
  onClose,
  onGoPrev,
  onGoNext,
  ariaLabel,
}: Props) {
  const open = activeIndex !== null && urls.length > 0 && activeIndex >= 0 && activeIndex < urls.length;

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onGoPrev();
      if (e.key === "ArrowRight") onGoNext();
    },
    [onClose, onGoPrev, onGoNext]
  );

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", handleKey);
    };
  }, [open, handleKey]);

  if (!open || activeIndex === null) return null;

  const src = urls[activeIndex];
  const total = urls.length;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/75 backdrop-blur-[1px]"
        onClick={onClose}
        aria-label="Close"
      />
      <div className="relative z-10 flex max-h-[min(92vh,900px)] w-full max-w-[min(96vw,920px)] flex-col overflow-hidden rounded-2xl border border-white/10 bg-neutral-900 shadow-2xl">
        <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-2 text-sm text-white/90">
          <span className="tabular-nums">
            {activeIndex + 1} / {total}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-white hover:bg-white/10"
          >
            ✕
          </button>
        </div>
        <div className="relative flex min-h-0 flex-1 items-center justify-center bg-neutral-950 p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt=""
            className="max-h-[min(85vh,860px)] w-auto max-w-full object-contain"
          />
        </div>
        {total > 1 ? (
          <div className="flex items-center justify-between gap-2 border-t border-white/10 px-3 py-3">
            <button
              type="button"
              aria-label="Previous document"
              onClick={onGoPrev}
              className="rounded-xl border border-white/20 px-4 py-2 text-sm font-medium text-white hover:bg-white/10"
            >
              ←
            </button>
            <button
              type="button"
              aria-label="Next document"
              onClick={onGoNext}
              className="rounded-xl border border-white/20 px-4 py-2 text-sm font-medium text-white hover:bg-white/10"
            >
              →
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
