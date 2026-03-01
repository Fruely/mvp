"use client";

import { useState, type ReactNode } from "react";
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
  children,
}: {
  specialist: SpecialistShellData;
  children: ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col bg-[#f5f7fa]">
        <TopBar specialist={specialist} onMenuClick={() => setSidebarOpen((prev) => !prev)} />
        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
