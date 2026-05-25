import fs from "fs";
import path from "path";

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(message);
}

function read(rel: string): string {
  return fs.readFileSync(path.join(process.cwd(), rel), "utf8");
}

function includesAll(text: string, snippets: string[], label: string): void {
  for (const snippet of snippets) {
    assert(text.includes(snippet), `${label} missing: ${snippet}`);
  }
}

console.log("=== Nong A v5.0 Staging Readiness Smoke ===");

const doc = read("docs/v5-staging-environment-setup.md");
const secretsDoc = read("docs/v5-staging-secrets-and-firebase-test-users.md");
const rulesStorageDoc = read("docs/v5-staging-rules-emulator-storage-decision.md");
const useChat = read("src/hooks/chat/useChat.ts");
const appStore = read("src/store.ts");

includesAll(
  doc,
  [
    "VITE_FIREBASE_API_KEY",
    "VITE_FIREBASE_AUTH_DOMAIN",
    "VITE_FIREBASE_PROJECT_ID",
    "VITE_FIREBASE_STORAGE_BUCKET",
    "VITE_FIREBASE_MESSAGING_SENDER_ID",
    "VITE_FIREBASE_APP_ID",
    "VITE_NONGA_PUBLIC_SIGNUP_ENABLED=\"false\"",
    "FIREBASE_SERVICE_ACCOUNT_JSON",
    "FIREBASE_PROJECT_ID",
    "FIREBASE_CLIENT_EMAIL",
    "FIREBASE_PRIVATE_KEY",
    "GEMINI_API_KEY",
    "APP_URL",
    "NODE_ENV=\"production\"",
  ],
  "staging env checklist"
);
console.log("PASS staging env checklist documents required values");

includesAll(
  secretsDoc,
  [
    "VITE_FIREBASE_API_KEY",
    "VITE_FIREBASE_AUTH_DOMAIN",
    "VITE_FIREBASE_PROJECT_ID",
    "VITE_FIREBASE_STORAGE_BUCKET",
    "VITE_FIREBASE_MESSAGING_SENDER_ID",
    "VITE_FIREBASE_APP_ID",
    "VITE_NONGA_PUBLIC_SIGNUP_ENABLED=\"false\"",
    "FIREBASE_SERVICE_ACCOUNT_JSON",
    "FIREBASE_CLIENT_EMAIL",
    "FIREBASE_PRIVATE_KEY",
    "GEMINI_API_KEY",
    "APP_URL",
    "NODE_ENV=\"production\"",
    "NONGA_BETA_DEALER_ID",
    "NONGA_DEALER_API_TOKEN",
    "NONGA_DEALER_TOKEN_MAP",
  ],
  "staging secrets checklist"
);
console.log("PASS staging secrets checklist documents required values");

includesAll(
  doc,
  [
    "npm run seed:v50-firebase-role-test-users -- --dry-run --json",
    "npm run seed:v50-firebase-role-test-users -- --write",
    "users/{memberUid}",
    "dealerMembers/{dealerUid_dealerId}",
    "npm run test:v50-security-rules",
    "firebase-tools@latest deploy --only firestore:rules,storage",
  ],
  "Firebase user and rules setup"
);
console.log("PASS Firebase users and rules staging plan documented");

includesAll(
  secretsDoc,
  [
    "Firebase Console > Authentication > Users",
    "npm run seed:v50-firebase-role-test-users -- --dry-run --json",
    "npm run seed:v50-firebase-role-test-users -- --write",
    "role: \"member\"",
    "role: \"dealer\"",
    "roleInDealer: \"owner\"",
    "status: \"active\"",
    "No passwords",
  ],
  "Firebase test user seed runbook"
);
console.log("PASS Firebase test user seed runbook documented");

includesAll(
  doc,
  [
    "data/marketplace-inventory.json",
    "data/dealer-draft-inventory.json",
    "data/listing-images/{listingId}",
    "/storage/listings/{listingId}",
    "ephemeral filesystem",
    "persistent volume",
    "Firebase Storage",
  ],
  "persistent storage checklist"
);
console.log("PASS persistent storage risks documented");

includesAll(
  secretsDoc,
  [
    "Option A",
    "Option B",
    "single persistent-disk staging host",
    "ephemeral",
    "Firestore/Storage migration",
    "Recommendation for the first staging rehearsal",
  ],
  "storage mode decision"
);
console.log("PASS storage mode decision documented");

includesAll(
  doc,
  [
    "Guest can view marketplace",
    "Dealer can attach images in chat",
    "Dealer can save a listing draft",
    "Chat history left sidebar can reopen old sessions",
    "Dealer A cannot see Dealer B",
    "Real mobile device testing follows",
  ],
  "staging smoke checklist"
);
console.log("PASS staging smoke checklist documented");

includesAll(
  secretsDoc,
  [
    "firebase-tools@latest emulators:start --only firestore,storage",
    "firebase-tools@latest deploy --only firestore:rules,storage",
    "Do not deploy these rules to production",
    "Dealer A cannot write dealer B",
  ],
  "rules emulator and deploy plan"
);
console.log("PASS rules emulator/deploy plan documented");

includesAll(
  rulesStorageDoc,
  [
    "Guest can read published listings",
    "Guest cannot write listing docs",
    "Member cannot change own `role`, `status`, or `dealerId`",
    "Dealer A cannot read or write Dealer B",
    "Dealer A cannot upload to Storage path for Dealer B",
    "Pending or disabled dealer membership cannot write",
    "Suspended user is blocked",
    "chatSessions",
    "Legacy `chats` is read-only",
    "firebase-tools@latest emulators:start --only firestore,storage",
  ],
  "Step 2P rules emulator matrix"
);
console.log("PASS Step 2P rules emulator matrix documented");

includesAll(
  rulesStorageDoc,
  [
    "Copy-Item firestore.rules.draft firestore.rules",
    "Copy-Item storage.rules.draft storage.rules",
    "deploy --only firestore:rules,storage --project <staging-project-id>",
    "Always pass `--project <staging-project-id>`",
    "Never rely on whatever Firebase project is currently active",
    "Do not deploy rules to production in Step 2P",
  ],
  "Step 2P staging deploy guard"
);
console.log("PASS Step 2P staging deploy guard documented");

includesAll(
  rulesStorageDoc,
  [
    "Recommendation for the first internal staging rehearsal",
    "Use Option A only if the staging target is a single host with persistent filesystem",
    "If the target is serverless, ephemeral, multi-instance",
    "Step 2Q: Firestore inventory/draft repository layer",
    "Step 2R: Firebase Storage image upload/migration",
    "Step 2S: Data migration script",
    "Step 2T: Emulator/integration tests",
  ],
  "Step 2P storage mode decision"
);
console.log("PASS Step 2P storage mode decision documented");

includesAll(
  rulesStorageDoc,
  [
    "data/.staging-persistence-probe",
    "Restart the app server",
    "Confirm the uploaded image URL still loads",
    "Perform a staging redeploy",
    "If any check fails, do not use Option A",
  ],
  "Step 2P persistent storage probe"
);
console.log("PASS Step 2P persistent storage probe documented");

for (const forbidden of [
  "AIzaSy",
  "-----BEGIN PRIVATE KEY-----",
  "password=",
  "PASSWORD=",
  "service_account",
]) {
  assert(!secretsDoc.includes(forbidden), `staging secrets doc must not contain ${forbidden}`);
}
console.log("PASS staging secrets doc contains no obvious real secrets");

assert(
  useChat.includes("ขออภัยครับ ระบบขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้งครับ"),
  "useChat should show friendly generic chat failure message"
);
for (const forbidden of [
  "รายละเอียดทางเทคนิค",
  "Unknown error",
  "Unauthorized",
  "Firebase internal",
  "stack trace",
  "raw server error",
]) {
  assert(!useChat.includes(forbidden), `useChat user-facing fallback should not include ${forbidden}`);
}
console.log("PASS chat streaming fallback hides technical details");

assert(
  appStore.includes("ขออภัยครับ ระบบขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้งครับ"),
  "legacy store chat fallback should show friendly generic message"
);
assert(
  !appStore.includes("กรุณากรอก API Key") && !appStore.includes("ตรวจสอบ API key"),
  "legacy store should not surface API key wording to users"
);
console.log("PASS legacy chat/AI fallback hides API key wording");
