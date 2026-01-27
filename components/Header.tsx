"use client";

import { ReactNode } from "react";

export default function Header({
  lang,
  children,
}: {
  lang: string;
  children?: ReactNode;
}) {
  return (
    <header>
      <nav>
        {children}
      </nav>
    </header>
  );
}
