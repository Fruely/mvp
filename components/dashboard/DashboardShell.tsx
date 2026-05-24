"use client";

import { useState, type ReactNode } from "react";
import type { Dictionary } from "@/lib/i18n";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

type SpecialistShellData = {
  name?: string | null;
  first_name?: string | null;
  avatar_url?: string | null;
  subscription_status?: string | null;
};

export default function DashboardShell({
  specialist,
  planStatusForBadge,
  children,
  lang,
  dict,
  isPublished,
}: {
  specialist: SpecialistShellData;
  /** Canonical `specialist_plan.plan_status`. */
  planStatusForBadge: string;
  children: ReactNode;
  lang: string;
  dict: Dictionary;
  isPublished: boolean;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      <Sidebar
        dict={dict}
        lang={lang}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isPublished={isPublished}
      />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col bg-[#f5f7fa]">
        <TopBar
          dict={dict}
          specialist={specialist}
          planStatusForBadge={planStatusForBadge}
          onMenuClick={() => setSidebarOpen((prev) => !prev)}
        />
        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
