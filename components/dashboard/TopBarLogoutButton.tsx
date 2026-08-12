"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { t, type Dictionary } from "@/lib/i18n";
import { getSupabase } from "@/lib/supabaseClient";

export default function TopBarLogoutButton({ dict }: { dict: Dictionary }) {
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = getSupabase();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <Button
      type="button"
      variant="ghost"
      onClick={handleLogout}
      className="min-h-[36px] h-9 px-freuly-3 py-1.5 text-freuly-body-sm"
    >
      {t(dict, "dashboard.logout")}
    </Button>
  );
}
