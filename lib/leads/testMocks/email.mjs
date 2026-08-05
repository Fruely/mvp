import { harness } from "../unlockContacts.harness.mjs";

export async function sendEmail(options) {
  harness.emailCalls.push({ ...options });
}

export function isEmailConfigured() {
  return true;
}
