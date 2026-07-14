/**
 * Dealer API token utilities — generate, validate, resolve from env.
 * Production stores the value in Google Secret Manager as `nonga-dealer-api-token`
 * (injected as NONGA_DEALER_API_TOKEN at runtime via src/utils/secretManager.ts).
 */
import crypto from "crypto";

export const DEALER_TOKEN_ENV_KEY = "NONGA_DEALER_API_TOKEN";
export const DEALER_TOKEN_GSM_SECRET_ID = "nonga-dealer-api-token";
export const DEFAULT_DEV_DEALER_TOKEN = "nonga-v4-dev-dealer-token";

export type TokenPresence = "present" | "missing";
export type TokenLengthState = "nonzero" | "zero";
export type TokenValidity = "valid" | "invalid";
export type YesNo = "yes" | "no";

export interface DealerTokenCheckResult {
  presence: TokenPresence;
  length: TokenLengthState;
  format: TokenValidity;
  isDevDefault: YesNo;
  leadingTrailingWhitespace: YesNo;
  containsNewline: YesNo;
  quotedValueRisk: YesNo;
  literalEnvTokenRisk: YesNo;
  startsWithBearerPrefix: YesNo;
  masked: "***MASKED***";
}

function yesNo(cond: boolean): YesNo {
  return cond ? "yes" : "no";
}

/** Generate a cryptographically secure dealer API token (64 hex chars). */
export function generateDealerApiToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/** Read dealer token from env without dev fallback. */
export function resolveDealerTokenFromEnv(
  env: NodeJS.ProcessEnv = process.env
): string {
  return String(env[DEALER_TOKEN_ENV_KEY] ?? "").trim();
}

/** Safe validation — never returns the raw token value. */
export function checkDealerToken(raw: string | undefined): DealerTokenCheckResult {
  const token = typeof raw === "string" ? raw : "";
  const present = token.length > 0;
  const whitespaceRisk = present && token !== token.trim();
  const newlineRisk = /[\r\n]/.test(token);
  const quotedRisk = /^['"].*['"]$/.test(token);
  const literalEnvRisk =
    /^\$[A-Z0-9_]+$/i.test(token) ||
    /^\$\{[A-Z0-9_]+\}$/i.test(token) ||
    /^(undefined|null)$/i.test(token) ||
    /^NONGA_DEALER_API_TOKEN$/i.test(token);
  const bearerPrefixRisk = /^Bearer\s+/i.test(token);
  const isDevDefault = token === DEFAULT_DEV_DEALER_TOKEN;

  const formatValid =
    present &&
    !whitespaceRisk &&
    !newlineRisk &&
    !quotedRisk &&
    !literalEnvRisk &&
    !bearerPrefixRisk &&
    token.length >= 32 &&
    !isDevDefault;

  return {
    presence: present ? "present" : "missing",
    length: present ? "nonzero" : "zero",
    format: formatValid ? "valid" : "invalid",
    isDevDefault: yesNo(isDevDefault),
    leadingTrailingWhitespace: yesNo(whitespaceRisk),
    containsNewline: yesNo(newlineRisk),
    quotedValueRisk: yesNo(quotedRisk),
    literalEnvTokenRisk: yesNo(literalEnvRisk),
    startsWithBearerPrefix: yesNo(bearerPrefixRisk),
    masked: "***MASKED***",
  };
}
