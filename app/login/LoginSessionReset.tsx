"use client";

import { useEffect } from "react";
import { getSupabase } from "@/lib/supabaseClient";

/**
 * Clears Supabase browser session/cookies on every visit to /login so stale
 * or corrupted client state does not block a fresh sign-in.
 */
export default function LoginSessionReset() {
  useEffect(() => {
    void getSupabase().auth.signOut();
  }, []);

  return null;
}
