"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getSupabase } from "@/lib/supabaseClient";
import { mapSupabaseAuthError } from "@/lib/auth/mapSupabaseAuthError";
import { isSupportedLang, t, type Dictionary, type Lang } from "@/lib/i18n";

export default function PartnerClaimClient({
  lang,
  dict,
  initialToken = "",
  nextPath = "onboarding",
}: {
  lang: string;
  dict: Dictionary;
  initialToken?: string;
  /** After claim: onboarding (agreement→payout→dashboard) or dashboard */
  nextPath?: "onboarding" | "dashboard";
}) {
  const search = useSearchParams();
  const tokenFromUrl = useMemo(
    () => initialToken || search?.get("token") || "",
    [initialToken, search]
  );
  const [token, setToken] = useState(tokenFromUrl);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function ensureSession() {
    const supabase = getSupabase();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session) return true;

    if (!email.trim() || !password.trim()) {
      setError(t(dict, "partner.claim.needAuth"));
      return false;
    }

    if (mode === "signin") {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });
      if (signInError) {
        setError(mapSupabaseAuthError(signInError, dict, "signin"));
        return false;
      }
      return true;
    }

    const signupLocale: Lang = isSupportedLang(lang) ? lang : "ru";
    const { error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password: password.trim(),
      options: {
        data: {
          locale: signupLocale,
        },
      },
    });
    if (signUpError) {
      setError(mapSupabaseAuthError(signUpError, dict, "signup"));
      return false;
    }
    const {
      data: { session: after },
    } = await supabase.auth.getSession();
    if (!after) {
      setMessage(t(dict, "partner.claim.checkEmail"));
      return false;
    }
    return true;
  }

  async function claim() {
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      const ok = await ensureSession();
      if (!ok) return;

      const res = await fetch("/api/partner/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(t(dict, "partner.claim.invalid"));
        return;
      }
      setMessage(t(dict, "partner.claim.success"));
      const dest =
        nextPath === "dashboard"
          ? `/${lang}/partner/dashboard`
          : `/${lang}/partners/onboarding`;
      window.location.assign(dest);
      void json;
    } catch {
      setError(t(dict, "partner.claim.invalid"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10 space-y-4">
      <h1 className="text-2xl font-semibold text-gray-900">{t(dict, "partner.claim.title")}</h1>
      <p className="text-sm text-gray-600">{t(dict, "partner.claim.subtitle")}</p>

      <label className="block text-sm">
        <span className="font-medium text-gray-700">{t(dict, "partner.claim.token")}</span>
        <input
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-xs"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          required
        />
      </label>

      <div className="flex gap-2 text-sm">
        <button
          type="button"
          className={mode === "signin" ? "font-semibold text-indigo-700" : "text-gray-500"}
          onClick={() => setMode("signin")}
        >
          {t(dict, "partner.claim.signIn")}
        </button>
        <span className="text-gray-300">|</span>
        <button
          type="button"
          className={mode === "signup" ? "font-semibold text-indigo-700" : "text-gray-500"}
          onClick={() => setMode("signup")}
        >
          {t(dict, "partner.claim.signUp")}
        </button>
      </div>

      <label className="block text-sm">
        <span className="font-medium text-gray-700">Email</span>
        <input
          type="email"
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
      </label>
      <label className="block text-sm">
        <span className="font-medium text-gray-700">{t(dict, "partner.claim.password")}</span>
        <input
          type="password"
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
        />
      </label>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}

      <button
        type="button"
        disabled={loading || !token.trim()}
        onClick={() => void claim()}
        className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {loading ? "…" : t(dict, "partner.claim.submit")}
      </button>
    </div>
  );
}
