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
    <section className="rounded-freuly-card border border-freuly-border-default bg-freuly-surface p-5 shadow-md sm:p-6">
      <header className="mb-4">
        <h2 className="text-xl font-semibold text-freuly-text-primary">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-freuly-text-secondary">{subtitle}</p> : null}
      </header>
      {children}
    </section>
  );
}
