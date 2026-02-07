"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getSupabase, SPECIALIST_OFFICE_PATH } from "@/lib/supabaseClient";

/** Parse access_token and refresh_token from URL hash (e.g. #access_token=...&refresh_token=...) */
function getTokensFromHash(): { access_token: string; refresh_token: string } | null {
  if (typeof window === "undefined" || !window.location.hash) return null;
  const params = new URLSearchParams(window.location.hash.slice(1));
  const access_token = params.get("access_token");
  const refresh_token = params.get("refresh_token");
  if (access_token && refresh_token) return { access_token, refresh_token };
  return null;
}

/**
 * Runs in the browser when user lands on /specialist/claim without ?token=...
 * (e.g. after magic link redirect with #access_token=... in URL).
 * Explicitly sets session from hash so cookie client has it before next request.
 */
export default function ClaimNoTokenHandler() {
  const router = useRouter();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    const supabase = getSupabase();

    const tokens = getTokensFromHash();
    const hasHash = typeof window !== "undefined" && window.location.hash?.includes("access_token");

    const goToDashboard = () => {
      if (handled.current) return;
      handled.current = true;
      router.replace(SPECIALIST_OFFICE_PATH);
    };

    const goToInvalid = () => {
      if (handled.current) return;
      handled.current = true;
      router.replace("/specialist/claim/invalid");
    };

    if (hasHash && tokens) {
      // Set session from hash so cookies are written; then redirect to dashboard.
      supabase.auth
        .setSession({ access_token: tokens.access_token, refresh_token: tokens.refresh_token })
        .then(({ data: { session }, error }) => {
          if (handled.current) return;
          if (error) {
            goToInvalid();
            return;
          }
          if (session) goToDashboard();
        })
        .catch(() => goToInvalid());

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (handled.current) return;
        if (session) goToDashboard();
      });
      const fallback = window.setTimeout(() => {
        if (!handled.current) goToInvalid();
      }, 5000);
      return () => {
        subscription.unsubscribe();
        window.clearTimeout(fallback);
      };
    }

    if (hasHash && !tokens) {
      // Hash present but missing tokens — wait a bit for client to parse, then fallback.
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (handled.current) return;
        if (session) goToDashboard();
      });
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (handled.current) return;
        if (session) goToDashboard();
      });
      const fallback = window.setTimeout(() => {
        if (!handled.current) goToInvalid();
      }, 5000);
      return () => {
        subscription.unsubscribe();
        window.clearTimeout(fallback);
      };
    }

    // No hash: check if session already exists (e.g. revisiting).
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (handled.current) return;
      if (session) goToDashboard();
      else goToInvalid();
    });
  }, [router]);

  return (
    <div className="flex min-h-[200px] items-center justify-center p-4 text-gray-600">
      Проверка входа…
    </div>
  );
}
