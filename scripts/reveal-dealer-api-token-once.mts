/**
 * Reveal existing NONGA_DEALER_API_TOKEN from session env once (for GSM upload).
 * Writes to gitignored file — never prints token to stdout.
 */
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import {
  checkDealerToken,
  DEALER_TOKEN_ENV_KEY,
  resolveDealerTokenFromEnv,
} from "../src/auth/tokenManager";

const OUT_FILE = path.resolve(process.cwd(), ".tmp-dealer-api-token-once.txt");

function loadEnvFile(): void {
  const envPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
}

function main(): void {
  loadEnvFile();
  const token = resolveDealerTokenFromEnv();
  const result = checkDealerToken(token);

  if (result.presence === "missing") {
    console.log(`HOLD — ${DEALER_TOKEN_ENV_KEY} missing in .env / session env`);
    console.log("Run: npm run generate:dealer-api-token");
    process.exit(1);
  }

  if (result.isDevDefault === "yes") {
    console.log("HOLD — current value is the dev placeholder, not a production secret");
    console.log("Run: npm run generate:dealer-api-token");
    process.exit(1);
  }

  fs.writeFileSync(OUT_FILE, token, { encoding: "utf8", mode: 0o600 });

  console.log("=== Dealer API Token Revealed (once) ===");
  console.log("");
  console.log(`Token written to: ${path.basename(OUT_FILE)}`);
  console.log("Open locally, copy for Secret Manager, then DELETE the file immediately.");
  console.log(`Status: ${DEALER_TOKEN_ENV_KEY}=${result.masked} (format: ${result.format})`);
  console.log("");
  console.log("DO NOT paste the token value in chat.");
}

main();
