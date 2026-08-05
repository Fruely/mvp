import { harness } from "../serviceRequests.harness.mjs";

export async function notify(eventType, payload) {
  if (harness.notifyShouldFail) {
    throw new Error("notify failed");
  }
  harness.notifyCalls.push({ eventType, payload });
}
