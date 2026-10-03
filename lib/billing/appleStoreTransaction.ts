import {
  Environment,
  SignedDataVerifier,
  VerificationException,
} from "@apple/app-store-server-library";
import { readFileSync } from "node:fs";
import { bundledAppleRootCertificates } from "@/lib/billing/appleRootCertificates";

export const CANONICAL_STORE_PRODUCT_ID = "freuly.request_access.eur.2500";
export const FREULY_IOS_BUNDLE_ID = "de.freuly.app";

export type AppleStoreEnvironmentName = "production" | "sandbox";

export type VerifiedApplePurchase = {
  transactionId: string;
  productId: string;
  bundleId: string;
  environment: AppleStoreEnvironmentName;
  /** Verified StoreKit app account token. Null when Apple omitted it. */
  appAccountToken: string | null;
};

export type AppleTransactionCheck =
  | { ok: true; transaction: VerifiedApplePurchase }
  | {
      ok: false;
      error: "invalid" | "wrong_product" | "wrong_bundle" | "wrong_environment" | "revoked" | "retryable";
    };

export type AppleStoreVerificationConfig = {
  bundleId: string;
  environment: Environment.PRODUCTION | Environment.SANDBOX;
  appAppleId?: number;
  rootCertificates: Buffer[];
};

type DecodedAppleTransaction = {
  transactionId?: string;
  productId?: string;
  bundleId?: string;
  environment?: string;
  revocationDate?: number | null;
  appAccountToken?: string | null;
};

export function interpretAppleTransaction(
  payload: DecodedAppleTransaction,
  expected: { bundleId: string; environment: Environment.PRODUCTION | Environment.SANDBOX },
): AppleTransactionCheck {
  const transactionId = text(payload.transactionId);
  const productId = text(payload.productId);
  const bundleId = text(payload.bundleId);
  if (!transactionId || !productId || !bundleId) return { ok: false, error: "invalid" };
  if (bundleId !== expected.bundleId) return { ok: false, error: "wrong_bundle" };
  if (productId !== CANONICAL_STORE_PRODUCT_ID) return { ok: false, error: "wrong_product" };
  if (typeof payload.revocationDate === "number") return { ok: false, error: "revoked" };
  const environment = appleEnvironmentName(payload.environment);
  const expectedName = expected.environment === Environment.PRODUCTION ? "production" : "sandbox";
  if (!environment || environment !== expectedName) return { ok: false, error: "wrong_environment" };
  return {
    ok: true,
    transaction: {
      transactionId,
      productId,
      bundleId,
      environment,
      appAccountToken: text(payload.appAccountToken)?.toLowerCase() ?? null,
    },
  };
}

export function readAppleStoreVerificationConfig(
  env: NodeJS.ProcessEnv = process.env,
): { ok: true; config: AppleStoreVerificationConfig } | { ok: false; error: "retryable" } {
  const bundleId = text(env.APPLE_STORE_BUNDLE_ID) ?? FREULY_IOS_BUNDLE_ID;
  if (bundleId !== FREULY_IOS_BUNDLE_ID) return { ok: false, error: "retryable" };
  const environmentName = text(env.APPLE_STORE_ENVIRONMENT);
  if (environmentName !== "Production" && environmentName !== "Sandbox") return { ok: false, error: "retryable" };
  const certificates = loadRootCertificates(env);
  if (!certificates) return { ok: false, error: "retryable" };
  if (environmentName === "Production") {
    const appAppleId = Number(text(env.APPLE_APP_APPLE_ID));
    if (!Number.isInteger(appAppleId) || appAppleId <= 0) return { ok: false, error: "retryable" };
    return {
      ok: true,
      config: {
        bundleId,
        environment: Environment.PRODUCTION,
        appAppleId,
        rootCertificates: certificates,
      },
    };
  }
  return {
    ok: true,
    config: {
      bundleId,
      environment: Environment.SANDBOX,
      rootCertificates: certificates,
    },
  };
}

export function createAppleSignedTransactionVerifier(config: AppleStoreVerificationConfig): {
  verify(signedTransaction: string): Promise<AppleTransactionCheck>;
} {
  const verifier = new SignedDataVerifier(
    config.rootCertificates,
    false,
    config.environment,
    config.bundleId,
    config.appAppleId,
  );
  return {
    async verify(signedTransaction: string): Promise<AppleTransactionCheck> {
      try {
        const payload = await verifier.verifyAndDecodeTransaction(signedTransaction);
        return interpretAppleTransaction(payload, {
          bundleId: config.bundleId,
          environment: config.environment,
        });
      } catch (error) {
        if (error instanceof VerificationException) return { ok: false, error: "invalid" };
        return { ok: false, error: "retryable" };
      }
    },
  };
}

function loadRootCertificates(env: NodeJS.ProcessEnv): Buffer[] | null {
  if (!Object.prototype.hasOwnProperty.call(env, "APPLE_ROOT_CERTIFICATE_PATHS")) {
    return bundledAppleRootCertificates();
  }
  const raw = env.APPLE_ROOT_CERTIFICATE_PATHS;
  if (typeof raw !== "string" || !raw.trim()) return null;
  const paths = raw.split(",").map((item) => item.trim()).filter(Boolean);
  if (!paths.length) return null;
  try {
    return paths.map((path) => readFileSync(path));
  } catch {
    return null;
  }
}

function appleEnvironmentName(value: string | undefined): AppleStoreEnvironmentName | null {
  if (value === Environment.PRODUCTION || value === "Production") return "production";
  if (value === Environment.SANDBOX || value === "Sandbox") return "sandbox";
  return null;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
