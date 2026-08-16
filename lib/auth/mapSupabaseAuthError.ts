import { t, type Dictionary } from "@/lib/i18n";

export type SupabaseAuthErrorLike = {
  message?: string | null;
  status?: number | null;
  code?: string | null;
};

function normalizedMessage(error: SupabaseAuthErrorLike): string {
  return (error.message ?? "").trim().toLowerCase();
}

function logAuthError(
  error: SupabaseAuthErrorLike,
  context: string | undefined,
  kind: string
): void {
  console.warn(`[auth${context ? `:${context}` : ""}] ${kind}`, {
    status: error.status ?? undefined,
    code: error.code ?? undefined,
    message: error.message ?? undefined,
  });
}

/**
 * Map Supabase Auth errors to localized user-facing copy.
 * Raw provider strings must not reach the UI.
 */
export function mapSupabaseAuthError(
  error: SupabaseAuthErrorLike | null | undefined,
  dict: Dictionary,
  context?: "signup" | "signin" | "recovery"
): string {
  if (!error) {
    return t(dict, "login.errorAuthGeneric");
  }

  const msg = normalizedMessage(error);
  const code = (error.code ?? "").toLowerCase();

  const isEmailRateLimit =
    msg.includes("email rate limit") ||
    (msg.includes("rate limit") && msg.includes("email")) ||
    (msg.includes("rate limit exceeded") && (context === "signup" || context === "recovery"));

  if (isEmailRateLimit) {
    logAuthError(error, context, "email_rate_limit");
    return context === "recovery"
      ? t(dict, "login.errorRecoveryRateLimit")
      : t(dict, "login.errorEmailRateLimit");
  }

  if (
    msg.includes("already registered") ||
    msg.includes("user already registered") ||
    code === "user_already_exists"
  ) {
    logAuthError(error, context, "already_registered");
    return t(dict, "login.errorAlreadyRegistered");
  }

  if (
    msg.includes("invalid login") ||
    msg.includes("invalid credentials") ||
    msg.includes("invalid email or password")
  ) {
    return t(dict, "login.errorInvalid");
  }

  logAuthError(error, context, "unmapped");
  if (context === "recovery") {
    return t(dict, "login.errorRecoveryGeneric");
  }
  if (context === "signup") {
    return t(dict, "login.errorSignUp");
  }
  if (context === "signin") {
    return t(dict, "login.errorSignIn");
  }
  return t(dict, "login.errorAuthGeneric");
}
