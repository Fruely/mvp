"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabaseClient";
import { specialistDashboardHrefClient } from "@/lib/specialists/dashboardHref";

/** Parse access_token and refresh_token from URL hash (e.g. #access_token=...&refresh_token=...) */
function getTokensFromHash(): { access_token: string; refresh_token: string } | null {
  if (typeof window === "undefined" || !window.location.hash) return null;
  const params = new URLSearchParams(window.location.hash.slice(1));
  const access_token = params.get("access_token");
  const refresh_token = params.get("refresh_token");
  if (access_token && refresh_token) return { access_token, refresh_token };
  return null;
}

function getJwtSub(token: string): string | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    return typeof payload?.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

function clearUrlHashPreservingPathAndQuery() {
  if (typeof window === "undefined") return;
  if (!window.location.hash) return;
  const cleanUrl = `${window.location.pathname}${window.location.search}`;
  window.history.replaceState(null, "", cleanUrl);
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
      router.refresh();
      router.replace(specialistDashboardHrefClient());
    };

    const stopLoading = () => {};

    if (hasHash && tokens) {
      const setupHashSession = async () => {
        try {
          const { data: { session: currentSession } } = await supabase.auth.getSession();
          const hashSub = getJwtSub(tokens.access_token);
          const currentSub = currentSession?.user?.id ?? null;

          // Clear conflicting stale session before applying hash tokens.
          if (hashSub && currentSub && hashSub !== currentSub) {
            await supabase.auth.signOut();
          }

          const { data: { session }, error } = await supabase.auth.setSession({
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
          });

          if (handled.current) return;
          if (error) {
            stopLoading();
            return;
          }
          if (session) {
            clearUrlHashPreservingPathAndQuery();
            goToDashboard();
          } else {
            stopLoading();
          }
        } catch {
          stopLoading();
        }
      };

      setupHashSession();

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (handled.current) return;
        if (session) {
          clearUrlHashPreservingPathAndQuery();
          goToDashboard();
        }
      });
      const fallback = window.setTimeout(() => {
        if (!handled.current) stopLoading();
      }, 6000);
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
        else stopLoading();
      });
      const fallback = window.setTimeout(() => {
        if (!handled.current) stopLoading();
      }, 6000);
      return () => {
        subscription.unsubscribe();
        window.clearTimeout(fallback);
      };
    }

    // No hash: verify user with getUser() (not getSession()).
    // getSession() can be stale locally and cause loop: claim -> dashboard -> login -> claim.
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (handled.current) return;
      if (user) goToDashboard();
      else stopLoading();
    });
  }, [router]);
  return null;
}
