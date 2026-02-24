"use client";

import Image from "next/image";

export default function SpecialistHero({
  name,
  avatarUrl,
  specialization,
  languages,
  isNew,
  onSendRequest,
  sendRequestLabel,
}: {
  name: string;
  avatarUrl: string | null;
  specialization: string | null;
  languages: string[];
  isNew: boolean;
  onSendRequest: () => void;
  sendRequestLabel: string;
}) {
  return (
    <section className="rounded-2xl border border-black/5 bg-white p-4 shadow-md sm:p-6">
      <div className="grid gap-5 md:grid-cols-[minmax(0,320px)_1fr] md:items-start">
        <div className="relative mx-auto w-full max-w-[320px] overflow-hidden rounded-2xl bg-gradient-to-br from-blue-100 via-indigo-100 to-purple-100 shadow-sm aspect-[4/5]">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={name}
              fill
              sizes="(min-width: 768px) 320px, (min-width: 640px) 60vw, 100vw"
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <span className="text-6xl" aria-hidden>
                👤
              </span>
            </div>
          )}
        </div>

        <div className="flex h-full flex-col justify-between gap-5">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold leading-tight text-gray-900 sm:text-3xl">{name}</h1>
              {isNew ? (
                <span className="rounded-full bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white">Новий</span>
              ) : null}
            </div>

            {specialization ? (
              <p className="max-w-2xl text-sm font-medium text-slate-600 sm:text-base">{specialization}</p>
            ) : null}

            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1">
                <span aria-hidden>💻</span>
                Онлайн
              </span>
              {languages.length > 0 ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1">
                  <span aria-hidden>🌐</span>
                  {languages.slice(0, 3).join(" • ")}
                </span>
              ) : null}
            </div>
          </div>

          <div>
            <button
              type="button"
              onClick={onSendRequest}
              className="inline-flex w-full items-center justify-center gap-1 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg sm:w-auto"
            >
              <span aria-hidden>⚡</span>
              {sendRequestLabel}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
