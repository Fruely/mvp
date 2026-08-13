"use client";

import type { ReactNode } from "react";

export default function SectionCard({
  title,
  subtitle,
  children,
  id,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  id?: string;
}) {
  return (
    <section id={id} className="scroll-mt-24 space-y-4 sm:space-y-6">
      <header>
        <h2 className="text-freuly-section-title text-freuly-text-primary">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-freuly-text-secondary">{subtitle}</p> : null}
      </header>
      <div className="rounded-2xl border border-freuly-border-default bg-freuly-surface p-5 sm:p-8">
        {children}
      </div>
    </section>
  );
}
