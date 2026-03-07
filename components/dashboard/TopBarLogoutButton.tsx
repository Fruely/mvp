"use client";

import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabaseClient";

export default function TopBarLogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = getSupabase();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="inline-flex h-9 items-center justify-center rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
    >
      Выйти / Logout
    </button>
  );
}
