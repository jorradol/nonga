/**
 * v6.9M — Thor Owner Gate / Controlled Revenue Pilot Go-No-Go Checklist
 * (static validation only)
 * npm run test:v69m-thor-owner-gate-controlled-revenue-pilot-go-no-go-checklist
 *
 * No fetch, no deploy, no gcloud, no Firestore, no Thor import, no auth bypass.
 */
import { readFileSync } from "node:fs";
import {
  PUBLIC_LISTING_REDACTED_SENSITIVE_VEHICLE_FIELDS,
  PUBLIC_LISTING_REDACTED_PRICE_INTERNAL_FIELDS,
  toPublicMarketplaceCarDto,
} from "../src/utils/publicMarketplaceListingPrivacy.ts";

const DOC_PATH =
  "docs/v6.9M-thor-owner-gate-controlled-revenue-pilot-go-no-go-checklist.md";
const HEAD_SHA = "ac835604eb3b6ee3131c0fd20342e584c37942c4";
const SHORT_HASH = "ac83560";
const LIVE_JS = "index-CtshoUt1.js";
const LIVE_CSS = "index-BTTuJqCy.css";
const STAGING_URL = "https://nonga-ce93c.web.app";

const V69L_C_RECORD =
  "docs/v6.9L-C-public-listing-sensitive-field-redaction-patch-execution-record.md";
const V69L_D_RECORD =
  "docs/v6.9L-D-staging-hosting-deploy-public-privacy-smoke-execution-record.md";
const V67C1_RECORD =
  "docs/v6.7C-1-dealer-inventory-real-buyerlead-queue-wiring-patch-execution-record.md";
const V67C1D_RECORD =
  "docs/v6.7C-1-D-staging-hosting-deploy-dealer-portal-inventory-smoke-execution-record.md";
const V67C1E_RECORD =
  "docs/v6.7C-1-E-authenticated-dealer-portal-inventory-lead-queue-smoke-execution-record.md";
const V69K_RECORD =
  "docs/v6.9K-safe-operator-authenticated-profile-avatar-smoke-closure-execution-record.md";

const SECRET_VALUE_PATTERNS = [
  /AIza[Sy][a-zA-Z0-9_-]{20,}/,
  /sk-[a-zA-Z0-9]{20,}/,
  /GEMINI_API_KEY\s*[=:]\s*['"][^'"]{8,}['"]/i,
  /Bearer\s+[a-zA-Z0-9._-]{20,}/i,
];

const PII_PATTERNS = [
  /\b0[689]\d[-\s]?\d{3}[-\s]?\d{4}\b/,
  /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/,
];

const AUTO_EXEC_AUTH_PATTERNS = [
  /thor\s+runtime\s+import\s+allowed\s+by\s+v6\.9M\?\s*=\s*yes/i,
  /approval\s+captured\s+by\s+v6\.9M\?\s*=\s*yes/i,
  /controlled\s+revenue\s+pilot\s+started\s+by\s+v6\.9M\?\s*=\s*yes/i,
  /v6\.9M\s+authorizes\s+thor\s+runtime\s+import/i,
  /go\s+for\s+thor\s+runtime\s+import.*current\s+state/i,
  /this\s+document\s+is\s+approval\s+to\s+import\s+thor/i,
];

const FULL_UID_PATTERNS = [/\b[A-Za-z0-9]{28}\b/];

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log(
  "=== v6.9M Thor Owner Gate / Controlled Revenue Pilot Go-No-Go Checklist ===\n"
);

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const pkg = readFileSync("package.json", "utf8");
const dealerInventorySrc = readFileSync(
  "src/components/dealer-portal/DealerInventoryPage.tsx",
  "utf8"
);

// --- doc structure ---
ok("doc exists", doc.length > 4000);
ok("doc v6.9M label", /v6\.9M/i.test(doc));
ok("head sha ac83560", doc.includes(HEAD_SHA) || doc.includes(SHORT_HASH));
ok(
  "branch feature/chat-image-attachment-v1",
  doc.includes("feature/chat-image-attachment-v1")
);
ok("executive summary section", /Executive Summary/i.test(doc));
ok("baseline section", /## 2\. Baseline/i.test(doc));
ok("readiness table section", /## 5\. Readiness Table/i.test(doc));
ok("blocker table section", /## 12\. Blocker Table/i.test(doc));
ok("owner approval checklist section", /## 13\. Owner Approval Checklist/i.test(doc));
ok("safe next-step plan section", /## 15\. Safe Next-Step Plan/i.test(doc));
ok("explicit no-go section", /## 14\. Explicit No-Go Items/i.test(doc));
ok("next smallest slice section", /## 16\. Next Smallest Slice/i.test(doc));
ok("go no-go verdict section", /## 17\. Go \/ No-Go Verdict/i.test(doc));
ok("non-authorization clause", /Non-Authorization Clause/i.test(doc));
ok("safety confirmations section", /## 18\. Safety Confirmations/i.test(doc));

// --- verdict ---
ok(
  "verdict PARTIAL PREPARE ONLY",
  /PARTIAL\s*—\s*PREPARE ONLY|PARTIAL -- PREPARE ONLY/i.test(doc)
);
ok(
  "not GO FOR THOR RUNTIME IMPORT as current verdict",
  /Current state:.*PARTIAL/i.test(doc) ||
    /Summary verdict[\s\S]*PARTIAL\s*—\s*PREPARE ONLY/i.test(doc)
);
ok(
  "thor runtime import blocked stated",
  /Thor runtime import.*BLOCKED|Thor Auto runtime import remains blocked/i.test(doc)
);
ok(
  "not production-ready claim",
  /not.*production-ready|NOT READY|Not production-ready/i.test(doc)
);
ok(
  "approval captured no",
  /Approval Captured by v6\.9M\?\s*=\s*No/i.test(doc)
);
ok(
  "thor import allowed no",
  /Thor Runtime Import Allowed by v6\.9M\?\s*=\s*No/i.test(doc)
);

// --- readiness coverage ---
ok("public listing privacy redaction", /public listing privacy redaction/i.test(doc));
ok("public api cars privacy", /\/api\/cars|public.*privacy regression/i.test(doc));
ok("dealer portal inventory lead queue", /Dealer Portal inventory lead queue/i.test(doc));
ok("buyerlead isolation", /BuyerLead.*isolation|lead-multi-owner/i.test(doc));
ok("reveal skip outcome scoped", /reveal|skip|outcome/i.test(doc));
ok("buyer pii masking", /Buyer PII masking|masked queue/i.test(doc));
ok("sandbox crm gating", /Sandbox CRM|DealerLeads/i.test(doc));
ok("authenticated dealer portal smoke gap", /authenticated Dealer Portal.*PARTIAL|NOT VERIFIED/i.test(doc));
ok("profile avatar smoke gap", /v6\.9K|profile\/avatar/i.test(doc));
ok("live staging bundle", doc.includes(LIVE_JS) && doc.includes(LIVE_CSS));
ok("staging host", doc.includes(STAGING_URL));

// --- dealer workflow ---
ok("dealer workflow section", /## 7\. Dealer Workflow Readiness/i.test(doc));
ok("real dealer leads question", /Can a real dealer see real buyer leads/i.test(doc));
ok("per-listing queue enough", /per-listing queue enough/i.test(doc));
ok("aggregated inbox defer", /aggregated.*DEFER|Parent Thor group/i.test(doc));

// --- thor owner gate ---
ok("thor owner gate section", /## 8\. Thor Auto Owner Gate/i.test(doc));
ok("dealer identity decision", /dealer identity/i.test(doc));
ok("inventory source decision", /inventory source/i.test(doc));
ok("vin plate policy", /VIN|license plate/i.test(doc));
ok("wholesale price policy", /wholesale|internal price/i.test(doc));
ok("lead monitor assignment", /monitors leads|monitor leads/i.test(doc));
ok("reveal handling", /reveal/i.test(doc));
ok("privacy leak stop", /privacy leak|Privacy leak/i.test(doc));

// --- data privacy gate ---
ok("data privacy gate section", /## 9\. Data \/ Privacy Gate/i.test(doc));
ok("no license plate public", /license plate.*public|No real license plate/i.test(doc));
ok("no vin public", /No VIN|no vin/i.test(doc));
ok("description pattern-based", /pattern-based|Description text/i.test(doc));
ok("address private notes policy", /address|private notes/i.test(doc));

// --- operations gate ---
ok("operations gate section", /## 10\. Operations Gate/i.test(doc));
ok("who logs in as dealer", /logs in|Who logs in/i.test(doc));
ok("lead check cadence", /cadence|Cadence/i.test(doc));
ok("rollback stop conditions", /rollback|stop condition/i.test(doc));

// --- business revenue gate ---
ok("business revenue gate section", /## 11\. Business \/ Revenue Gate/i.test(doc));
ok("subscription not required first pilot", /NOT REQUIRED FOR FIRST PILOT/i.test(doc));
ok("manual commission path", /commission|manual.*admin/i.test(doc));
ok("thor auto one dealer", /Thor Auto.*1 dealer|1 real dealer/i.test(doc));
ok("two more dealers criteria", /2 more real dealers|adding 2 more/i.test(doc));

// --- readiness status labels ---
ok("status READY in table", /\*\*READY\*\*/.test(doc));
ok("status PARTIAL in table", /\*\*PARTIAL\*\*/.test(doc));
ok("status BLOCKED in table", /\*\*BLOCKED\*\*/.test(doc));
ok("status DEFER in table", /\*\*DEFER\*\*/.test(doc));
ok(
  "status NOT REQUIRED FOR FIRST PILOT",
  /NOT REQUIRED FOR FIRST PILOT/i.test(doc)
);

// --- cross-doc references ---
ok("v69l-c reference", doc.includes("v6.9L-C"));
ok("v69l-d reference", doc.includes("v6.9L-D"));
ok("v67c1 reference", doc.includes("v6.7C-1"));
ok("v67c1e reference", doc.includes("v6.7C-1-E"));
ok("v69k reference", doc.includes("v6.9K"));
ok("v69l-c record exists", readFileSync(V69L_C_RECORD, "utf8").length > 500);
ok("v69l-d record exists", readFileSync(V69L_D_RECORD, "utf8").length > 500);
ok("v67c1 record exists", readFileSync(V67C1_RECORD, "utf8").length > 500);
ok("v67c1d record exists", readFileSync(V67C1D_RECORD, "utf8").length > 500);
ok("v67c1e record exists", readFileSync(V67C1E_RECORD, "utf8").length > 500);
ok("v69k record exists", readFileSync(V69K_RECORD, "utf8").length > 500);

// --- no auto-approval language ---
for (const pattern of AUTO_EXEC_AUTH_PATTERNS) {
  ok(`no auto-exec auth ${pattern}`, !pattern.test(doc));
}

// --- privacy / secrets in doc ---
for (const pattern of SECRET_VALUE_PATTERNS) {
  ok(`no secret pattern in doc ${pattern}`, !pattern.test(doc));
}
for (const pattern of PII_PATTERNS) {
  ok(`no pii pattern in doc ${pattern}`, !pattern.test(doc));
}
for (const pattern of FULL_UID_PATTERNS) {
  const matches = doc.match(new RegExp(pattern, "g")) ?? [];
  const suspicious = matches.filter(
    (m) => m.length >= 28 && !m.includes("ac83560")
  );
  ok(`no full firebase uid ${pattern}`, suspicious.length === 0);
}

// --- forbidden actions in doc ---
ok("forbidden deploy", /does not deploy|Deploy performed.*NO/i.test(doc));
ok("forbidden firestore", /does not write Firestore|Firestore writes.*NO/i.test(doc));
ok("forbidden thor import", /does not import Thor|Thor data imported.*NO/i.test(doc));
ok("forbidden auth bypass", /auth.*bypass.*NO|No auth bypass|does not.*auth bypass/i.test(doc));

// --- static code alignment (no network) ---
ok(
  "vin field in redaction constants",
  PUBLIC_LISTING_REDACTED_SENSITIVE_VEHICLE_FIELDS.includes("vin")
);
ok(
  "licensePlate in redaction constants",
  PUBLIC_LISTING_REDACTED_SENSITIVE_VEHICLE_FIELDS.includes("licensePlate")
);
ok(
  "wholesalePrice in redaction constants",
  PUBLIC_LISTING_REDACTED_PRICE_INTERNAL_FIELDS.includes("wholesalePrice")
);
{
  const dto = toPublicMarketplaceCarDto({
    id: "synthetic-test-listing",
    brand: "Test",
    model: "Car",
    year: 2024,
    price: 500000,
    vin: "SYNTHETICVIN1234567",
    licensePlate: "กก-9999",
    wholesalePrice: 400000,
    ownerPhone: "0000000000",
  } as Parameters<typeof toPublicMarketplaceCarDto>[0]);
  ok("dto strips vin", !("vin" in dto) || (dto as Record<string, unknown>).vin === undefined);
  ok(
    "dto strips licensePlate",
    !("licensePlate" in dto) ||
      (dto as Record<string, unknown>).licensePlate === undefined
  );
  ok(
    "dto strips wholesalePrice",
    !("wholesalePrice" in dto) ||
      (dto as Record<string, unknown>).wholesalePrice === undefined
  );
}
ok(
  "dealer inventory imports ListingLeadQueueSection",
  dealerInventorySrc.includes("ListingLeadQueueSection")
);

// --- package script ---
ok(
  "package script registered",
  pkg.includes(
    "test:v69m-thor-owner-gate-controlled-revenue-pilot-go-no-go-checklist"
  )
);

console.log(
  "\nDone v6.9M Thor owner gate controlled revenue pilot go-no-go checklist tests.\n"
);
