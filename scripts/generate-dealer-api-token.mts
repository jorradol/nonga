/**
 * Generate a new NONGA_DEALER_API_TOKEN for Secret Manager / local .env setup.
 * Writes the token once to a gitignored file — never logs the value to stdout.
 */
import fs from "fs";
import path from "path";
import {
  DEALER_TOKEN_ENV_KEY,
  DEALER_TOKEN_GSM_SECRET_ID,
  generateDealerApiToken,
} from "../src/auth/tokenManager";

const OUT_FILE = path.resolve(process.cwd(), ".tmp-dealer-api-token-once.txt");
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT?.trim() || "nonga-ce93c";

function main(): void {
  const token = generateDealerApiToken();

  fs.writeFileSync(OUT_FILE, token, { encoding: "utf8", mode: 0o600 });

  console.log("=== Dealer API Token Generated ===");
  console.log("");
  console.log(`Token written once to: ${path.basename(OUT_FILE)}`);
  console.log("(file is gitignored — open locally, copy, then delete the file)");
  console.log("");
  console.log("Next steps for Uncle Den:");
  console.log("1. Open .tmp-dealer-api-token-once.txt in this folder");
  console.log("2. Copy the token to your password manager");
  console.log("3. Delete .tmp-dealer-api-token-once.txt immediately after copying");
  console.log("4. Upload to Google Secret Manager (production):");
  console.log("");
  console.log(`   echo "<paste-token>" | gcloud secrets create ${DEALER_TOKEN_GSM_SECRET_ID} \\`);
  console.log(`     --project="${PROJECT_ID}" --data-file=-`);
  console.log("");
  console.log("   # or add a new version if secret already exists:");
  console.log("");
  console.log(`   echo "<paste-token>" | gcloud secrets versions add ${DEALER_TOKEN_GSM_SECRET_ID} \\`);
  console.log(`     --project="${PROJECT_ID}" --data-file=-`);
  console.log("");
  console.log(`5. For local dev only, set in .env:`);
  console.log(`   ${DEALER_TOKEN_ENV_KEY}="<paste-token>"`);
  console.log("");
  console.log("6. Verify (masked, safe): npm run check:dealer-token-session-env");
  console.log("");
  console.log("DO NOT paste the token value in chat, docs, or git.");
}

main();
