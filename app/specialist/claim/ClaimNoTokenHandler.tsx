"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabaseClient";

/**
 * Runs in the browser when user lands on /specialist/claim without ?token=...
 * (e.g. after magic link redirect with #access_token=... in URL).
 * Hash is only available on the client; Supabase establishes session from it here.
 */
export default function ClaimNoTokenHandler() {
  const router = useRouter();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    const supabase = getSupabase();

    const hasHash = typeof window !== "undefined" && window.location.hash?.includes("access_token");

    if (hasHash) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (handled.current) return;
        if (session) {
          handled.current = true;
          router.replace("/specialist/dashboard");
        }
      });
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (handled.current) return;
        if (session) {
          handled.current = true;
          subscription.unsubscribe();
          router.replace("/specialist/dashboard");
        }
      });
      const fallback = window.setTimeout(() => {
        if (handled.current) return;
        handled.current = true;
        subscription.unsubscribe();
        router.replace("/specialist/claim/invalid");
      }, 2500);
      return () => {
        subscription.unsubscribe();
        window.clearTimeout(fallback);
      };
    }

    // No hash: check if session already exists (e.g. revisiting).
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (handled.current) return;
      if (session) {
        handled.current = true;
        router.replace("/specialist/dashboard");
      } else {
        handled.current = true;
        router.replace("/specialist/claim/invalid");
      }
    });
  }, [router]);

  return (
    <div className="flex min-h-[200px] items-center justify-center p-4 text-gray-600">
      Проверка входа…
    </div>
  );
}
