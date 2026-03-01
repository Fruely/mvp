export function isContactsLocked(subscriptionStatus: string | null | undefined): boolean {
  return subscriptionStatus === "expired";
}

