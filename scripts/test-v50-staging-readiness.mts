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
