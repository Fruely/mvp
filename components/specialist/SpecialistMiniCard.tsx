"use client";

import Link from "next/link";
import Image from "next/image";

const MAX_DESC = 175;

type SpecialistMiniCardProps = {
  id: string;
  lang: string;
  name: string;
  title: string;
  description: string;
  city: string;
  avatar_url?: string | null;
};

function truncate(s: string, max: number) {
  if (s.length <= max) return s;
  const cut = s.slice(0, max).trim();
  const last = cut.lastIndexOf(" ");
  return last > max * 0.6 ? cut.slice(0, last) + "…" : cut + "…";
}

export default function SpecialistMiniCard({
  id,
  lang,
  name,
  title,
  description,
  city,
  avatar_url,
}: SpecialistMiniCardProps) {
  const href = `/${lang}/specialist/${id}`;
  const text = truncate(description, MAX_DESC);

  return (
    <Link
      href={href}
      className="group flex w-full flex-col rounded-2xl border border-gray-100 bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)] transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-[0_8px_28px_rgba(0,0,0,0.1)] md:max-w-[300px] md:min-h-[350px]"
    >
      <div className="mx-auto mb-4 flex h-[112px] w-[112px] shrink-0 overflow-hidden rounded-xl bg-gray-100">
        {avatar_url ? (
          <Image
            src={avatar_url}
            alt={name}
            width={112}
            height={112}
            className="h-full w-full object-cover"
            unoptimized
          />
        ) : (
          <div className="h-full w-full bg-gray-200" aria-hidden />
        )}
      </div>
      <h3 className="truncate text-base font-semibold text-gray-900">{name}</h3>
      <p className="mt-0.5 shrink-0 truncate text-sm text-gray-500">{title}</p>
      <p className="mt-3 min-h-0 flex-1 text-sm leading-relaxed text-gray-600 line-clamp-4">
        {text}
      </p>
      <p className="mt-3 shrink-0 text-xs text-gray-400">{city}</p>
    </Link>
  );
}
