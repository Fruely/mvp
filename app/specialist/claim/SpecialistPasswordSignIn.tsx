"use client";

import { useState } from "react";
import { getSupabase } from "@/lib/supabaseClient";
import { specialistDashboardHrefClient } from "@/lib/specialists/dashboardHref";
import { t, type Dictionary, type Lang } from "@/lib/i18n";

type Props = {
  lang: Lang;
  dict: Dictionary;
  nextPath?: string | null;
  allowPartnerSignUp?: boolean;
};

export default function SpecialistPasswordSignIn({
  lang,
  dict,
  nextPath = null,
  allowPartnerSignUp = false,
}: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function postAuthRedirectHref(): string {
    if (nextPath) return nextPath;
    return specialistDashboardHrefClient();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    if (!trimmedEmail || !trimmedPassword) {
      setError(t(dict, "login.errorRequired"));
      return;
    }
    setLoading(true);
    try {
      const supabase = getSupabase();
      await supabase.auth.signOut();

      if (mode === "signup" && allowPartnerSignUp) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: trimmedEmail,
          password: trimmedPassword,
        });
        if (signUpError) {
          setError(signUpError.message || t(dict, "login.errorSignUp"));
          return;
        }
        if (!data.session) {
          setMessage(t(dict, "login.signUpCheckEmail"));
          setMode("signin");
          return;
        }
        window.location.assign(`${window.location.origin}${postAuthRedirectHref()}`);
        return;
      }

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password: trimmedPassword,
      });
      if (signInError) {
        if (signInError.message?.toLowerCase().includes("invalid login")) {
          setError(t(dict, "login.errorInvalid"));
        } else {
          setError(signInError.message || t(dict, "login.errorSignIn"));
        }
        return;
      }
      const targetHref = postAuthRedirectHref();
      if (data.session) {
        window.location.assign(`${window.location.origin}${targetHref}`);
        return;
      }
      setError(t(dict, "login.errorNoSession"));
    } catch {
      setError(t(dict, "login.errorNetwork"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mx-auto max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">{t(dict, "login.title")}</h2>
      <p className="mt-1 text-sm text-gray-600">
        {allowPartnerSignUp ? t(dict, "login.subtitlePartner") : t(dict, "login.subtitle")}
      </p>
      {allowPartnerSignUp ? (
        <div className="mt-3 flex rounded-lg border border-gray-200 p-1 text-sm">
          <button
            type="button"
            className={`flex-1 rounded-md px-3 py-1.5 font-medium ${
              mode === "signin" ? "bg-gray-900 text-white" : "text-gray-600"
            }`}
            onClick={() => setMode("signin")}
          >
            {t(dict, "login.signIn")}
          </button>
          <button
            type="button"
            className={`flex-1 rounded-md px-3 py-1.5 font-medium ${
              mode === "signup" ? "bg-gray-900 text-white" : "text-gray-600"
            }`}
            onClick={() => setMode("signup")}
          >
            {t(dict, "login.signUp")}
          </button>
        </div>
      ) : null}
      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <div>
          <label htmlFor="claim-email" className="block text-sm font-medium text-gray-700">
            {t(dict, "login.email")}
          </label>
          <input
            id="claim-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            required
          />
        </div>
        <div>
          <label htmlFor="claim-password" className="block text-sm font-medium text-gray-700">
            {t(dict, "login.password")}
          </label>
          <input
            id="claim-password"
            type="password"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            required
          />
        </div>
        {error ? (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="text-sm text-indigo-700" role="status">
            {message}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
        >
          {loading
            ? mode === "signup" && allowPartnerSignUp
              ? t(dict, "login.creatingAccount")
              : t(dict, "login.submitting")
            : mode === "signup" && allowPartnerSignUp
              ? t(dict, "login.createAccount")
              : t(dict, "login.submit")}
        </button>
        <a
          href={`/${lang}/reset-password`}
          className="mt-1 block text-center text-sm text-blue-600 hover:underline"
        >
          {t(dict, "login.forgotPassword")}
        </a>
      </form>
      <p className="mt-4 text-xs text-gray-500">
        {t(dict, "login.noPassword")}{" "}
        <a href="mailto:freuly.de@gmail.com" className="text-blue-600 underline">
          freuly.de@gmail.com
        </a>
        .
      </p>
    </section>
  );
}
