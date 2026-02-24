"use client";

import type { ReactNode } from "react";

export default function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-black/5 bg-white p-5 shadow-md sm:p-6">
      <header className="mb-4">
        <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-gray-600">{subtitle}</p> : null}
      </header>
      {children}
    </section>
  );
}
