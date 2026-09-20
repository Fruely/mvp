import {
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

export const AGENT_API_KEY_PREFIX = "frly_agent_";

const TOKEN_PATTERN =
  /^frly_agent_([a-f0-9]{12})_([A-Za-z0-9_-]{40,96})$/;

export type ParsedAgentCredential = {
  keyPrefix: string;
  raw: string;
};

export type GeneratedAgentCredential = {
  raw: string;
  keyPrefix: string;
  credentialHash: string;
};

export function parseAgentCredential(
  value: unknown,
): ParsedAgentCredential | null {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  const match = raw.match(TOKEN_PATTERN);
  if (!match) return null;

  return {
    keyPrefix: match[1],
    raw,
  };
}

export function hashAgentCredential(
  rawCredential: string,
  pepper: string,
): string {
  if (!pepper || pepper.length < 32) {
    throw new Error("AGENT_API_KEY_PEPPER must be at least 32 characters");
  }
  return createHmac("sha256", pepper)
    .update(rawCredential)
    .digest("hex");
}

export function verifyAgentCredentialHash(
  rawCredential: string,
  pepper: string,
  expectedHash: string,
): boolean {
  if (!/^[a-f0-9]{64}$/i.test(expectedHash)) return false;
  const actual = Buffer.from(
    hashAgentCredential(rawCredential, pepper),
    "hex",
  );
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function generateAgentCredential(
  pepper: string,
): GeneratedAgentCredential {
  const keyPrefix = randomBytes(6).toString("hex");
  const secret = randomBytes(32).toString("base64url");
  const raw = `${AGENT_API_KEY_PREFIX}${keyPrefix}_${secret}`;

  return {
    raw,
    keyPrefix,
    credentialHash: hashAgentCredential(raw, pepper),
  };
}

export function readAgentApiKeyPepper(): string | null {
  const pepper = process.env.AGENT_API_KEY_PEPPER?.trim() ?? "";
  return pepper.length >= 32 ? pepper : null;
}
