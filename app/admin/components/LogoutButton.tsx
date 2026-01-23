"use client";

import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    // Clear localStorage (for compatibility with existing pages)
    try {
      localStorage.removeItem("ADMIN_API_TOKEN");
      localStorage.removeItem("admin_login_time");
    } catch {
      // ignore
    }

    // Clear cookie via API
    await fetch("/admin/logout", { method: "POST" });
    
    // Redirect to login
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition"
    >
      Logout
    </button>
  );
}
