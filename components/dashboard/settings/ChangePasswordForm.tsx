"use client";

import { useState } from "react";
import { Button, Input } from "@/components/ui";
import { t, type Dictionary } from "@/lib/i18n";
import { getSupabase } from "@/lib/supabaseClient";

type Props = {
  email: string;
  dict: Dictionary;
};

export default function ChangePasswordForm({ email, dict }: Props) {
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
      setError(t(dict, "dashboard.settingsPage.passwordTooShort"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t(dict, "dashboard.settingsPage.passwordMismatch"));
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
        setError(t(dict, "dashboard.settingsPage.wrongCurrentPassword"));
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        setError(t(dict, "dashboard.settingsPage.updateFailed"));
        return;
      }

      setSuccess(t(dict, "dashboard.settingsPage.updateSuccess"));
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setError(t(dict, "dashboard.settingsPage.updateFailed"));
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
        setError(t(dict, "dashboard.settingsPage.resetFailed"));
        return;
      }
      setResetMessage(t(dict, "dashboard.settingsPage.resetSent"));
    } catch {
      setError(t(dict, "dashboard.settingsPage.resetFailed"));
    } finally {
      setSendingReset(false);
    }
  }

  return (
    <div className="space-y-freuly-4">
      <form onSubmit={handleSubmit} className="space-y-freuly-3">
        <Input
          id="settings-current-password"
          type="password"
          label={t(dict, "dashboard.settingsPage.currentPassword")}
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          autoComplete="current-password"
          required
        />

        <Input
          id="settings-new-password"
          type="password"
          label={t(dict, "dashboard.settingsPage.newPassword")}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          autoComplete="new-password"
          required
        />

        <Input
          id="settings-confirm-password"
          type="password"
          label={t(dict, "dashboard.settingsPage.confirmPassword")}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
          required
        />

        {error ? <p className="text-freuly-body-sm text-freuly-error">{error}</p> : null}
        {success ? <p className="text-freuly-body-sm text-freuly-success">{success}</p> : null}

        <Button type="submit" disabled={loading}>
          {loading ? t(dict, "dashboard.settingsPage.saving") : t(dict, "dashboard.settingsPage.changePassword")}
        </Button>
      </form>

      <div className="border-t border-freuly-border-subtle pt-freuly-3">
        <button
          type="button"
          onClick={() => void handleForgotPassword()}
          disabled={sendingReset}
          className="text-freuly-body-sm font-medium text-freuly-primary transition hover:text-freuly-primary-hover disabled:opacity-60"
        >
          {t(dict, "dashboard.settingsPage.forgotPassword")}
        </button>
        {resetMessage ? <p className="mt-freuly-2 text-freuly-body-sm text-freuly-success">{resetMessage}</p> : null}
      </div>
    </div>
  );
}
