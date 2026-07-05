/**
 * v14.3AC owner Firebase ID token session env checker
 * Safe local-only check. No network call. No endpoint call. No Gemini call.
 */

type Presence = "present" | "missing";
type LengthState = "nonzero" | "zero";
type Validity = "valid-shape" | "invalid-shape";
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
  jwtThreeSegments: YesNo;
  masked: "***MASKED***";
}

function yesNo(cond: boolean): YesNo {
  return cond ? "yes" : "no";
}

function isJwtLike(token: string): boolean {
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  return parts.every((part) => /^[A-Za-z0-9\-_]+$/.test(part) && part.length > 0);
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
    /^NONGA_OWNER_FIREBASE_ID_TOKEN$/i.test(token) ||
    /^NONGA_ADMIN_API_TOKEN$/i.test(token);
  const bearerPrefixRisk = /^Bearer\s+/i.test(token);
  const jwtThreeSegments = present && isJwtLike(token);

  const shapeValid =
    present &&
    !whitespaceRisk &&
    !newlineRisk &&
    !quotedRisk &&
    !literalEnvRisk &&
    !bearerPrefixRisk &&
    jwtThreeSegments;

  return {
    presence: present ? "present" : "missing",
    length: present ? "nonzero" : "zero",
    format: shapeValid ? "valid-shape" : "invalid-shape",
    leadingTrailingWhitespace: yesNo(whitespaceRisk),
    containsNewline: yesNo(newlineRisk),
    quotedValueRisk: yesNo(quotedRisk),
    literalEnvTokenRisk: yesNo(literalEnvRisk),
    startsWithBearerPrefix: yesNo(bearerPrefixRisk),
    jwtThreeSegments: yesNo(jwtThreeSegments),
    masked: "***MASKED***",
  };
}

function printResult(result: TokenCheckResult): void {
  console.log(`NONGA_OWNER_FIREBASE_ID_TOKEN: ${result.presence}`);
  console.log(`length: ${result.length}`);
  console.log(`format: ${result.format}`);
  console.log(`leading/trailing whitespace: ${result.leadingTrailingWhitespace}`);
  console.log(`contains newline: ${result.containsNewline}`);
  console.log(`quoted value risk: ${result.quotedValueRisk}`);
  console.log(`literal env token risk: ${result.literalEnvTokenRisk}`);
  console.log(`starts with Bearer prefix: ${result.startsWithBearerPrefix}`);
  console.log(`jwt three segments: ${result.jwtThreeSegments}`);
  console.log(`token: ${result.masked}`);
}

const result = checkToken(process.env.NONGA_OWNER_FIREBASE_ID_TOKEN);
printResult(result);

if (result.presence === "missing") {
  console.log("HOLD — NONGA_OWNER_FIREBASE_ID_TOKEN missing in owner/session env");
  process.exit(1);
}

if (result.format !== "valid-shape") {
  console.log("HOLD — Firebase ID token format invalid or unsafe");
  process.exit(1);
}

console.log(
  "READY FOR OWNER USER-VISIBLE FIREBASE AUTH PREFLIGHT — token present in session env"
);
