"use client";

import { useState } from "react";
import { getSupabase } from "@/lib/supabaseClient";

type Props = {
  email: string;
};

export default function ChangePasswordForm({ email }: Props) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword.length < 8) {
      setError("Пароль должен быть не короче 8 символов.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Пароли не совпадают.");
      return;
    }

    setLoading(true);
    try {
      const supabase = getSupabase();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });

      if (signInError) {
        setError("Неверный текущий пароль.");
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        setError("Не удалось обновить пароль. Попробуйте ещё раз.");
        return;
      }

      setSuccess("Пароль обновлён.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setError("Не удалось обновить пароль. Попробуйте ещё раз.");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    setResetMessage(null);
    setError(null);
    setSendingReset(true);
    try {
      const supabase = getSupabase();
      const redirectTo = `${window.location.origin}/auth/reset-password`;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (resetError) {
        setError("Не удалось отправить письмо для сброса. Попробуйте ещё раз.");
        return;
      }
      setResetMessage("Письмо для сброса пароля отправлено. Проверьте почту.");
    } catch {
      setError("Не удалось отправить письмо для сброса. Попробуйте ещё раз.");
    } finally {
      setSendingReset(false);
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Текущий пароль</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
            autoComplete="current-password"
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Новый пароль</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
            autoComplete="new-password"
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Повторите новый пароль</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
            autoComplete="new-password"
            required
          />
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {success ? <p className="text-sm text-emerald-600">{success}</p> : null}

        <button
          type="submit"
          disabled={loading}
          className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? "Сохранение..." : "Сменить пароль"}
        </button>
      </form>

      <div className="border-t border-gray-100 pt-3">
        <button
          type="button"
          onClick={() => void handleForgotPassword()}
          disabled={sendingReset}
          className="text-sm font-medium text-blue-600 hover:text-blue-700 disabled:opacity-60"
        >
          Забыли пароль? Отправить письмо для сброса
        </button>
        {resetMessage ? <p className="mt-2 text-sm text-emerald-600">{resetMessage}</p> : null}
      </div>
    </div>
  );
}

