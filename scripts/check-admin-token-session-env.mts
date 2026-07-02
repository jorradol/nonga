/**
 * v12.13 Admin token session env checker
 * Safe local-only check. No network call. No endpoint call. No Gemini call.
 */

type Presence = "present" | "missing";
type LengthState = "nonzero" | "zero";
type Validity = "valid" | "invalid";
type YesNo = "yes" | "no";

interface TokenCheckResult {
  presence: Presence;
  length: LengthState;
  format: Validity;
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

function checkToken(raw: string | undefined): TokenCheckResult {
  const token = typeof raw === "string" ? raw : "";
  const present = token.length > 0;
  const whitespaceRisk = present && token !== token.trim();
  const newlineRisk = /[\r\n]/.test(token);
  const quotedRisk = /^['"].*['"]$/.test(token);
  const literalEnvRisk =
    /^\$[A-Z0-9_]+$/i.test(token) ||
    /^\$\{[A-Z0-9_]+\}$/i.test(token) ||
    /^(undefined|null)$/i.test(token) ||
    /^NONGA_ADMIN_API_TOKEN$/i.test(token);
  const bearerPrefixRisk = /^Bearer\s+/i.test(token);

  const formatValid =
    present &&
    !whitespaceRisk &&
    !newlineRisk &&
    !quotedRisk &&
    !literalEnvRisk &&
    !bearerPrefixRisk;

  return {
    presence: present ? "present" : "missing",
    length: present ? "nonzero" : "zero",
    format: formatValid ? "valid" : "invalid",
    leadingTrailingWhitespace: yesNo(whitespaceRisk),
    containsNewline: yesNo(newlineRisk),
    quotedValueRisk: yesNo(quotedRisk),
    literalEnvTokenRisk: yesNo(literalEnvRisk),
    startsWithBearerPrefix: yesNo(bearerPrefixRisk),
    masked: "***MASKED***",
  };
}

function printResult(result: TokenCheckResult): void {
  console.log(`NONGA_ADMIN_API_TOKEN: ${result.presence}`);
  console.log(`length: ${result.length}`);
  console.log(`format: ${result.format}`);
  console.log(`leading/trailing whitespace: ${result.leadingTrailingWhitespace}`);
  console.log(`contains newline: ${result.containsNewline}`);
  console.log(`quoted value risk: ${result.quotedValueRisk}`);
  console.log(`literal env token risk: ${result.literalEnvTokenRisk}`);
  console.log(`starts with Bearer prefix: ${result.startsWithBearerPrefix}`);
  console.log(`token: ${result.masked}`);
}

const result = checkToken(process.env.NONGA_ADMIN_API_TOKEN);
printResult(result);

if (result.presence === "missing") {
  console.log("HOLD — NONGA_ADMIN_API_TOKEN missing in operator/session env");
  process.exit(1);
}

if (result.format !== "valid") {
  console.log("HOLD — token format invalid or unsafe");
  process.exit(1);
}

console.log("READY FOR ADMIN AUTH NON-GEMINI LIVE RECHECK — token present in session env");
