"use client";

import { COOKIE_CONSENT_OPEN_EVENT } from "@/lib/consent/cookieConsent";

type CookieSettingsLinkProps = {
  label: string;
  className?: string;
};

export default function CookieSettingsLink({
  label,
  className,
}: CookieSettingsLinkProps) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_OPEN_EVENT));
      }}
    >
      {label}
    </button>
  );
}
