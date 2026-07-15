"use client";

import Image from "next/image";

type SpecialistAvatarImageProps = {
  src: string | null | undefined;
  alt: string;
  /** Matches public profile hero cropping (4:3, object-contain). */
  className?: string;
  loading?: boolean;
};

export default function SpecialistAvatarImage({
  src,
  alt,
  className = "",
  loading = false,
}: SpecialistAvatarImageProps) {
  const trimmed = typeof src === "string" ? src.trim() : "";

  return (
    <div
      className={`relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-slate-100 ${className}`.trim()}
    >
      {trimmed ? (
        <Image
          src={trimmed}
          alt={alt}
          fill
          className="object-contain object-center"
          sizes="(max-width: 768px) 100vw, 320px"
          unoptimized
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-100 via-indigo-100 to-purple-100">
          <span className="text-5xl" aria-hidden>
            👤
          </span>
        </div>
      )}

      {loading ? (
        <div
          className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-[1px]"
          aria-live="polite"
          aria-busy="true"
        >
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
        </div>
      ) : null}
    </div>
  );
}
