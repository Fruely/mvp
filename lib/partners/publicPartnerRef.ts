import { createHash } from "node:crypto";

const ALPHABET = "0123456789ABCDEFGHJKLMNPQRSTUVWXYZ";

/** Stable external partner reference for contract PDFs (no raw UUID in user-facing docs). */
export function publicPartnerRef(partnerId: string): string {
  const id = partnerId.trim().toLowerCase();
  if (!id) return "FR-PT-0000";
  const digest = createHash("sha256").update(id, "utf8").digest();
  let n = BigInt("0x" + digest.subarray(0, 6).toString("hex"));
  let out = "";
  const base = BigInt(ALPHABET.length);
  for (let i = 0; i < 4; i += 1) {
    out = ALPHABET[Number(n % base)] + out;
    n = n / base;
  }
  return `FR-PT-${out}`;
}
