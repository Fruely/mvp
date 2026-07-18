import { createHash } from "node:crypto";

const ALPHABET = "0123456789ABCDEFGHJKLMNPQRSTUVWXYZ";

/**
 * Stable public commission reference (no specialist UUID).
 * Example: FR-P-8K2M
 */
export function publicCommissionRef(commissionId: string): string {
  const id = commissionId.trim().toLowerCase();
  if (!id) return "FR-P-0000";
  const digest = createHash("sha256").update(id, "utf8").digest();
  let n = BigInt("0x" + digest.subarray(0, 6).toString("hex"));
  let out = "";
  const base = BigInt(ALPHABET.length);
  for (let i = 0; i < 4; i += 1) {
    out = ALPHABET[Number(n % base)] + out;
    n = n / base;
  }
  return `FR-P-${out}`;
}
