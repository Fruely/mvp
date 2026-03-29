"use client";

import Link from "next/link";
import Image from "next/image";
import { getSpecialistUrl } from "@/lib/urls";

const MAX_DESC = 175;

type SpecialistMiniCardProps = {
  id: string;
  slug?: string | null;
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
  slug,
  lang,
  name,
  title,
  description,
  city,
  avatar_url,
}: SpecialistMiniCardProps) {
  const href = getSpecialistUrl(lang, { id, slug });
  const text = truncate(description, MAX_DESC);

  return (
    <Link
      href={href}
      className="group flex w-full flex-col rounded-md border border-gray-100 bg-white p-5 shadow-card transition-all duration-200 ease-out hover:-translate-y-1 hover:scale-[1.02] hover:shadow-lg md:max-w-[300px] md:min-h-[350px]"
    >
      <div className="mx-auto mb-4 flex h-[112px] w-[112px] shrink-0 overflow-hidden rounded-md bg-gray-100">
        {avatar_url ? (
          <Image
            src={avatar_url}
            alt={name}
            width={112}
            height={112}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            unoptimized
          />
        ) : (
          <div className="h-full w-full bg-gray-200" aria-hidden />
        )}
      </div>
      <h3 className="truncate text-base font-semibold text-textPrimary">{name}</h3>
      <p className="mt-0.5 shrink-0 truncate text-sm font-normal text-textSecondary">{title}</p>
      <p className="mt-3 min-h-0 flex-1 text-sm font-normal leading-relaxed text-textSecondary line-clamp-4">
        {text}
      </p>
      <p className="mt-3 shrink-0 text-xs text-textSecondary">{city}</p>
    </Link>
  );
}
