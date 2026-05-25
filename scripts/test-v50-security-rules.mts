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

console.log("=== Nong A v5.0 Security Rules Draft Smoke ===");

const firestore = read("firestore.rules.draft");
const stagingFirestore = read("firestore.rules");
const storage = read("storage.rules.draft");
const docs = read("docs/firestore-storage-rules-v5.md");

assert(
  stagingFirestore === firestore,
  "firestore.rules should match firestore.rules.draft before staging deploy"
);
console.log("PASS Firestore staging rules match draft");

includesAll(
  firestore,
  [
    "match /users/{uid}",
    "safeUserSelfUpdate",
    "\"role\"",
    "\"status\"",
    "\"dealerId\"",
    "match /dealerMembers/{membershipId}",
    "hasActiveDealerMembership",
    "match /cars/{listingId}",
    "match /dealerListings/{listingId}",
    "match /dealerDrafts/{draftId}",
    "match /listingImages/{imageId}",
    "match /chatSessions/{sessionId}",
    "match /chats/{chatId}",
    "match /messages/{messageId}",
    "match /ai_preferences/{scopeKey}",
    "allow read, write: if false",
  ],
  "firestore draft"
);
console.log("PASS Firestore draft covers users, dealerMembers, listings, chats, images");

includesAll(
  firestore,
  [
    "dealerMemberDoc(request.auth.uid, dealerId).status == \"active\"",
    "sameDealerId()",
    "canReadChatSession",
    "publishedListing(resource.data)",
    "isSuperAdmin()",
    "isActiveAdmin()",
  ],
  "firestore dealer/admin constraints"
);
console.log("PASS Firestore draft protects dealer scope and role management");

includesAll(
  storage,
  [
    "match /listing-images/{dealerId}/{listingId}/{fileName}",
    "match /draft-images/{dealerId}/{draftId}/{fileName}",
    "match /chat-attachments/{dealerId}/{sessionId}/{fileName}",
    "match /user-avatars/{uid}/{fileName}",
    "hasActiveDealerMembership(dealerId)",
    "request.resource.contentType.matches(\"image/.*\")",
    "request.resource.size <= maxBytes",
    "isSafeImageUpload(5 * 1024 * 1024)",
    "allow read, write: if false",
  ],
  "storage draft"
);
console.log("PASS Storage draft covers dealer image paths and image constraints");

includesAll(
  docs,
  [
    "not deployed",
    "users/{uid}",
    "dealerMembers",
    "cars/{listingId}",
    "chatSessions/{sessionId}",
    "chats/{chatId}",
    "data/marketplace-inventory.json",
    "data/dealer-draft-inventory.json",
    "/storage/listings/{listingId}",
    "Guest:",
    "Dealer:",
    "How Role Self-Escalation Is Blocked",
    "Manual emulator plan",
  ],
  "rules docs"
);
console.log("PASS Security docs include inventory, role matrix, and emulator plan");
