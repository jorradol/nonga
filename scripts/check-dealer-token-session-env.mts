/**
 * Safe dealer token session env checker.
 * No network call. No endpoint call. Token value is always masked.
 */
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import {
  checkDealerToken,
  DEALER_TOKEN_ENV_KEY,
  resolveDealerTokenFromEnv,
} from "../src/auth/tokenManager";

function loadEnvFile(): void {
  const envPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
}

function printResult(result: ReturnType<typeof checkDealerToken>): void {
  console.log(`${DEALER_TOKEN_ENV_KEY}: ${result.presence}`);
  console.log(`length: ${result.length}`);
  console.log(`format: ${result.format}`);
  console.log(`is dev default (${"nonga-v4-dev-dealer-token"}): ${result.isDevDefault}`);
  console.log(`leading/trailing whitespace: ${result.leadingTrailingWhitespace}`);
  console.log(`contains newline: ${result.containsNewline}`);
  console.log(`quoted value risk: ${result.quotedValueRisk}`);
  console.log(`literal env token risk: ${result.literalEnvTokenRisk}`);
  console.log(`starts with Bearer prefix: ${result.startsWithBearerPrefix}`);
  console.log(`token: ${result.masked}`);
}

loadEnvFile();
const result = checkDealerToken(resolveDealerTokenFromEnv());
printResult(result);

if (result.presence === "missing") {
  console.log("HOLD — NONGA_DEALER_API_TOKEN missing in operator/session env");
  console.log("Run: npm run generate:dealer-api-token");
  process.exit(1);
}

if (result.isDevDefault === "yes") {
  console.log(
    "HOLD — token is the local dev placeholder; generate a production token before Secret Manager upload"
  );
  console.log("Run: npm run generate:dealer-api-token");
  process.exit(1);
}

if (result.format !== "valid") {
  console.log("HOLD — token format invalid or unsafe");
  process.exit(1);
}

console.log("READY — dealer API token present and valid in session env");
