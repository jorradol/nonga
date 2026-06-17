/**
 * v6.7C-1 — Dealer inventory real BuyerLead queue wiring patch execution record
 * (static validation only)
 * npm run test:v67c1-dealer-inventory-real-buyerlead-queue-wiring-patch-execution-record
 */
import { readFileSync } from "node:fs";

const DOC_PATH =
  "docs/v6.7C-1-dealer-inventory-real-buyerlead-queue-wiring-patch-execution-record.md";
const HEAD_SHA = "d2ac583ca1221f55bd76102c3d8d78973f42ff57";
const SHORT_HASH = "d2ac583";
const PREV_SHA = "2235ce0129c4963b2c7d4a3a6fba8dde396526b5";
const PREV_SHORT = "2235ce0";
const PUSH_RANGE = "2235ce0..d2ac583";
const PATCH_MESSAGE =
  "feat(dealer): wire real BuyerLead queue into Dealer Portal inventory";

const PATCH_FILES = [
  "src/components/dealer-portal/DealerInventoryPage.tsx",
  "src/components/dealer/DealerSidebar.tsx",
  "src/components/DealerDashboardView.tsx",
  "src/components/dealer/DealerLeads.tsx",
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
  "=== v6.7C-1 Dealer Inventory Real BuyerLead Queue Wiring Patch Execution Record ===\n"
);

const doc = readFileSync(DOC_PATH, "utf8");
const pkg = readFileSync("package.json", "utf8");
const docLower = doc.toLowerCase();

{
  ok("doc exists", doc.length > 800);
  ok("doc v6.7C-1 label", /v6\.7C-1/i.test(doc));
  ok("overall PASS verdict", /\*\*สถานะ:\*\*.*PASS|Overall.*PASS/i.test(doc));
  ok("head sha d2ac583", doc.includes(HEAD_SHA));
  ok("short hash d2ac583", doc.includes(SHORT_HASH));
  ok(
    "previous head 2235ce0",
    doc.includes(PREV_SHA) || doc.includes(PREV_SHORT)
  );
  ok("push range 2235ce0..d2ac583", doc.includes(PUSH_RANGE));
  ok(
    "branch feature/chat-image-attachment-v1",
    doc.includes("feature/chat-image-attachment-v1")
  );
  ok("patch commit message", doc.includes(PATCH_MESSAGE));
  ok(
    "lead multi-owner isolation test pass",
    /test:lead-multi-owner-isolation.*PASS|lead-multi-owner-isolation.*PASS/i.test(
      doc
    )
  );
  ok(
    "v56d buyer lead queue test pass",
    /test:v56d-buyer-lead-queue.*PASS|v56d-buyer-lead-queue.*PASS/i.test(doc)
  );
  ok(
    "v56e seller masked lead queue test pass",
    /test:v56e-seller-masked-lead-queue.*PASS|v56e-seller-masked-lead-queue.*PASS/i.test(
      doc
    )
  );
  ok(
    "v56e3 seller queue smoke ux test pass",
    /test:v56e3-seller-queue-smoke-ux.*PASS|v56e3-seller-queue-smoke-ux.*PASS/i.test(
      doc
    )
  );
  ok("npm run lint pass", /npm run lint.*PASS|`npm run lint`/i.test(doc));
  ok("push success", /Push result.*SUCCESS|Result.*SUCCESS/i.test(doc));
  ok(
    "four patch files changed stat",
    doc.includes("4 files changed") || doc.includes("4 allowed")
  );
  ok(
    "ListingLeadQueueSection wired",
    doc.includes("ListingLeadQueueSection")
  );
  ok(
    "SellerMaskedLeadQueuePanel referenced",
    doc.includes("SellerMaskedLeadQueuePanel")
  );
  ok(
    "before no real lead queue on dealer portal",
    /Before.*no real lead queue|Dealer Portal inventory had no real lead queue/i.test(
      doc
    )
  );
  ok(
    "after per-listing queue on dealer portal",
    /After.*ListingLeadQueueSection|surfaces real per-listing/i.test(doc)
  );
  ok(
    "sandbox DealerLeads demo banner",
    /Demo CRM|demo.*CRM|sandbox.*DealerLeads/i.test(doc)
  );
  ok(
    "v6.7A audit context",
    /v6\.7A audit|Context from v6\.7A/i.test(doc)
  );
  ok(
    "no aggregated dealer inbox risk",
    /No aggregated dealer inbox|no aggregated dealer inbox/i.test(doc)
  );
  ok(
    "parent thor group gap",
    /Parent Thor group|parent-group lead/i.test(doc)
  );
  ok(
    "staging dealer inventory smoke not performed",
    /staging dealer-inventory smoke.*NOT|dealer-inventory smoke.*NOT/i.test(doc)
  );
  ok("no staging deploy", /Staging Hosting deploy.*NO|Staging deploy.*NO/i.test(doc));
  ok(
    "thor runtime import blocked",
    /Thor Auto real runtime import.*blocked|Still blocked/i.test(doc)
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
    "backend api route no changes",
    /Backend.*API route.*NO|No backend.*API route|backend\/API route changes.*NO/i.test(
      doc
    )
  );
  ok(
    "firestore not touched",
    /Firestore.*Not touched|firestore.*not touched/i.test(doc)
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
    "buyer pii not in docs",
    /Buyer phone.*email.*private lead|buyer phone.*email/i.test(doc)
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
      "test:v67c1-dealer-inventory-real-buyerlead-queue-wiring-patch-execution-record"
    )
  );
  ok(
    "lead multi-owner isolation script exists in package",
    pkg.includes("test:lead-multi-owner-isolation")
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
  "\nDone v6.7C-1 dealer inventory real BuyerLead queue wiring patch execution record tests.\n"
);
