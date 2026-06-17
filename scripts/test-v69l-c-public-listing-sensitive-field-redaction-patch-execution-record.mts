/**
 * v6.9L-C — Public listing sensitive field redaction patch execution record
 * (static validation only)
 * npm run test:v69l-c-public-listing-sensitive-field-redaction-patch-execution-record
 */
import { readFileSync } from "node:fs";

const DOC_PATH =
  "docs/v6.9L-C-public-listing-sensitive-field-redaction-patch-execution-record.md";
const HEAD_SHA = "0d03318ffb9c3d55c9bc9f335a31765711d30c03";
const SHORT_HASH = "0d03318";
const PREV_SHA = "0e85e234bcb72c7f724a6ed37f86f99f09042ea6";
const PREV_SHORT = "0e85e23";
const PUSH_RANGE = "0e85e23..0d03318";
const PATCH_MESSAGE =
  "fix(privacy): redact sensitive vehicle fields from public listing DTO";

const PATCH_FILES = [
  "src/utils/publicMarketplaceListingPrivacy.ts",
  "scripts/test-v69l-c-public-listing-sensitive-field-redaction.mts",
  "scripts/test-v545b3-public-api-privacy.mts",
  "package.json",
];

const SECRET_PATTERNS = [
  /AIza[Sy][a-zA-Z0-9_-]{20,}/,
  /Bearer\s+[A-Za-z0-9._-]{20,}/i,
  /Authorization:\s*Bearer/i,
  /sk-[a-zA-Z0-9]{20,}/,
  /GEMINI_API_KEY\s*[=:]\s*['"][^'"]{8,}['"]/i,
];

const PII_PATTERNS = [
  /\b0[689]\d[-\s]?\d{3}[-\s]?\d{4}\b/,
  /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/,
];

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log(
  "=== v6.9L-C Public Listing Sensitive Field Redaction Patch Execution Record ===\n"
);

const doc = readFileSync(DOC_PATH, "utf8");
const pkg = readFileSync("package.json", "utf8");
const docLower = doc.toLowerCase();

{
  ok("doc exists", doc.length > 800);
  ok("doc v6.9L-C label", /v6\.9L-C/i.test(doc));
  ok("overall PASS verdict", /\*\*สถานะ:\*\*.*PASS|Overall.*PASS/i.test(doc));
  ok("head sha 0d03318", doc.includes(HEAD_SHA));
  ok("short hash 0d03318", doc.includes(SHORT_HASH));
  ok("previous head 0e85e23", doc.includes(PREV_SHA) || doc.includes(PREV_SHORT));
  ok("push range 0e85e23..0d03318", doc.includes(PUSH_RANGE));
  ok(
    "branch feature/chat-image-attachment-v1",
    doc.includes("feature/chat-image-attachment-v1")
  );
  ok("patch commit message", doc.includes(PATCH_MESSAGE));
  ok(
    "v69l-c redaction test pass 41",
    /41\/41|41\/41/.test(doc) || /41\/41/.test(doc)
  );
  ok(
    "v545b3 privacy test pass 26",
    /26\/26/.test(doc)
  );
  ok("npm run lint pass", /npm run lint.*PASS|`npm run lint`/i.test(doc));
  ok("push success", /Push result.*SUCCESS|Result.*SUCCESS/i.test(doc));
  ok(
    "four patch files changed stat",
    doc.includes("4 files changed") || doc.includes("4 allowed")
  );
  ok(
    "publicMarketplaceListingPrivacy module",
    doc.includes("publicMarketplaceListingPrivacy.ts") &&
      /sanitizePublicListingDescription/i.test(doc)
  );
  ok("vin removed from public dto", /`vin`.*Deleted|removes `vin`/i.test(doc));
  ok(
    "licensePlate removed",
    /`licensePlate`.*Deleted|removes `licensePlate`/i.test(doc)
  );
  ok(
    "wholesale fields removed",
    /wholesalePrice|wholesaleInternalPrice/i.test(doc)
  );
  ok(
    "GET /api/cars path protected",
    /GET \/api\/cars/i.test(doc) && /toPublicMarketplaceCarDtoList/i.test(doc)
  );
  ok(
    "chat inventory loader path",
    /chat inventory loader|loadChatInventory/i.test(doc)
  );
  ok(
    "v6.9L-B audit context",
    /v6\.9L-B audit|Context from v6\.9L-B/i.test(doc)
  );
  ok("no staging deploy", /Staging Hosting deploy.*NO|Staging deploy.*NO/i.test(doc));
  ok(
    "live privacy smoke not performed",
    /live staging public privacy smoke.*NOT|Live staging public privacy smoke.*NOT/i.test(
      doc
    )
  );
  ok(
    "thor runtime import blocked",
    /Thor Auto real runtime import.*blocked|Still blocked/i.test(doc)
  );
  ok(
    "residual description pattern risk",
    /pattern-based|pattern based/i.test(docLower)
  );
  ok(
    "residual address in description",
    /address in description|Address in description/i.test(doc)
  );
  ok(
    "residual ownerId public",
    /ownerId.*remain|ownerId.*public/i.test(doc)
  );
  ok(
    "production pilot still NOT READY",
    /Production pilot.*NOT READY|Production Pilot.*NOT READY/i.test(doc)
  );
  ok(
    "not production-ready",
    /not production-ready|Not production-ready/i.test(doc)
  );
  ok(
    "not pilot-ready",
    /not pilot-ready|Not pilot-ready/i.test(doc)
  );
  ok("cloud run not touched", /Cloud Run.*Not touched|Cloud Run not touched/i.test(doc));
  ok(
    "production not touched",
    /Production.*Not touched|Production deploy.*NO/i.test(doc)
  );
  ok(
    "auth session routing not changed",
    /Auth.*Not changed|auth.*session.*Not changed/i.test(doc)
  );
  ok(
    "firestore not touched",
    /Firestore.*Not touched|firestore.*not touched/i.test(doc)
  );
  ok(
    "leads not touched",
    /Lead system.*DealerLeads|DealerLeads.*Not touched/i.test(doc)
  );
  ok(
    "payment boost not touched",
    /Payment.*boost.*Not touched|payment.*invoice.*boost/i.test(doc)
  );
  ok(
    "ai runtime not touched",
    /AI runtime.*Not touched|Gemini.*Not touched/i.test(doc)
  );
  ok(
    "recommended staging deploy next",
    /Staging Hosting deploy|staging Hosting deploy/i.test(doc)
  );
  for (const file of PATCH_FILES) {
    ok(`patch file listed: ${file}`, doc.includes(file));
  }
  ok(
    "package script registered",
    pkg.includes(
      "test:v69l-c-public-listing-sensitive-field-redaction-patch-execution-record"
    )
  );
  ok(
    "redaction unit test script exists in package",
    pkg.includes("test:v69l-c-public-listing-sensitive-field-redaction")
  );
  ok(
    "no raw full gemini output",
    !/"finalAnswerTh"\s*:\s*"[\s\S]{150,}/.test(doc) &&
      !/```[\s\S]{400,}```/.test(doc)
  );
  ok(
    "no full prompt dump",
    !docLower.includes("system instruction:") &&
      !docLower.includes("combined prompt:")
  );
  for (const pattern of SECRET_PATTERNS) {
    ok(`no secret pattern ${pattern}`, !pattern.test(doc));
  }
  for (const pattern of PII_PATTERNS) {
    ok(`no pii pattern ${pattern}`, !pattern.test(doc));
  }
}

console.log(
  "\nDone v6.9L-C public listing sensitive field redaction patch execution record tests.\n"
);
