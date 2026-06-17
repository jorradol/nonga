/**
 * v6.7C-1-D — Staging hosting deploy + dealer portal inventory smoke execution record
 * (static validation only)
 * npm run test:v67c1d-staging-hosting-deploy-dealer-portal-inventory-smoke-execution-record
 */
import { readFileSync } from "node:fs";

const DOC_PATH =
  "docs/v6.7C-1-D-staging-hosting-deploy-dealer-portal-inventory-smoke-execution-record.md";
const HEAD_SHA = "2f74a6d222b81368f33654841a2f81a8b82165ce";
const SHORT_HASH = "2f74a6d";
const PATCH_SHA = "d2ac583ca1221f55bd76102c3d8d78973f42ff57";
const PATCH_SHORT = "d2ac583";
const PRIOR_JS = "index-CZrVhuOd.js";
const LIVE_JS = "index-CtshoUt1.js";
const PRIOR_CSS = "index-v8LQYv3A.css";
const LIVE_CSS = "index-BTTuJqCy.css";
const STAGING_URL = "https://nonga-ce93c.web.app";
const CUSTOM_DOMAIN = "https://a.nongbot.org";
const STAGING_PROJECT = "nonga-ce93c";
const DEPLOY_CMD =
  "npx -y firebase-tools@latest deploy --only hosting --project nonga-ce93c";

const BUNDLE_MARKERS = [
  "dealer-leads-demo-crm-notice",
  "Demo CRM",
  "isSimulatedState",
  "ไม่ใช่ลีดจริง",
  "ไปคิวลีดจริง",
  "คิวลูกค้าสนใจจริง",
  "DealerInventoryPage",
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
  "=== v6.7C-1-D Staging Hosting Deploy + Dealer Portal Inventory Smoke Execution Record ===\n"
);

const doc = readFileSync(DOC_PATH, "utf8");
const pkg = readFileSync("package.json", "utf8");
const docLower = doc.toLowerCase();

{
  ok("doc exists", doc.length > 800);
  ok("doc v6.7C-1-D label", /v6\.7C-1-D/i.test(doc));
  ok(
    "overall PARTIAL verdict",
    /\*\*สถานะ:\*\*.*PARTIAL|Overall result.*PARTIAL/i.test(doc)
  );
  ok("head sha 2f74a6d", doc.includes(HEAD_SHA));
  ok("short hash 2f74a6d", doc.includes(SHORT_HASH));
  ok("patch sha d2ac583", doc.includes(PATCH_SHA));
  ok("patch short d2ac583", doc.includes(PATCH_SHORT));
  ok(
    "branch feature/chat-image-attachment-v1",
    doc.includes("feature/chat-image-attachment-v1")
  );
  ok("working tree clean", /working tree.*clean|Working tree.*clean/i.test(doc));
  ok(
    "no commit during deploy smoke",
    /Commit during deploy\/smoke.*NO|no commit during deploy\/smoke/i.test(doc)
  );
  ok(
    "no runtime code changes deploy smoke",
    /Runtime code changes.*NO|no runtime code changes/i.test(doc)
  );

  ok(
    "lead multi-owner isolation pass",
    /test:lead-multi-owner-isolation.*PASS/i.test(doc)
  );
  ok(
    "v56d buyer lead queue pass",
    /test:v56d-buyer-lead-queue.*PASS/i.test(doc)
  );
  ok(
    "v56e seller masked lead queue pass",
    /test:v56e-seller-masked-lead-queue.*PASS/i.test(doc)
  );
  ok(
    "v56e3 seller queue smoke ux pass",
    /test:v56e3-seller-queue-smoke-ux.*PASS/i.test(doc)
  );
  ok(
    "v67c1 patch record guard pass",
    /test:v67c1-dealer-inventory-real-buyerlead-queue-wiring-patch-execution-record.*PASS/i.test(
      doc
    )
  );
  ok("npm run lint pass", /npm run lint.*PASS/i.test(doc));
  ok("build staging hosting pass", /build:staging:hosting.*PASS/i.test(doc));
  ok(
    "firebase web config guard pass",
    /Firebase web config guard.*PASS|vite-firebase-guard.*PASS/i.test(doc)
  );
  ok("dist bundle verify pass", /Dist bundle verify.*PASS|dist bundle verified/i.test(doc));

  ok("deploy command documented", doc.includes(DEPLOY_CMD));
  ok("deploy result success", /Deploy result.*SUCCESS|Result.*SUCCESS/i.test(doc));
  ok("hosting only scope", /Firebase Hosting only|Hosting only/i.test(doc));
  ok("staging project nonga-ce93c", doc.includes(STAGING_PROJECT));
  ok("staging url", doc.includes(STAGING_URL));
  ok("custom domain a.nongbot.org", doc.includes(CUSTOM_DOMAIN));
  ok("files uploaded 6", /6 files|6 files from `dist`/i.test(doc));
  ok("3 new asset files uploaded", /3 new asset files/i.test(doc));

  ok("live js asset CtshoUt1", doc.includes(LIVE_JS));
  ok("live css asset BTTuJqCy", doc.includes(LIVE_CSS));
  ok("prior js asset CZrVhuOd", doc.includes(PRIOR_JS));
  ok("prior css asset v8LQYv3A", doc.includes(PRIOR_CSS));
  ok("live bundle js reference", doc.includes(`/assets/${LIVE_JS}`));
  ok("live bundle css reference", doc.includes(`/assets/${LIVE_CSS}`));

  ok(
    "background asset verification section",
    /Background asset check|Live asset verification/i.test(doc)
  );
  ok("new js http 200", /index-CtshoUt1\.js.*200|New JS HTTP.*200/i.test(doc));
  ok("new css http 200", /index-BTTuJqCy\.css.*200|New CSS HTTP.*200/i.test(doc));
  ok(
    "old js still http 200 orphaned",
    /index-CZrVhuOd\.js.*200|orphaned|not referenced/i.test(doc)
  );

  for (const marker of BUNDLE_MARKERS) {
    ok(`bundle marker: ${marker}`, doc.includes(marker));
  }
  ok(
    "listing lead queue section not verified live",
    /ListingLeadQueueSection.*NOT VERIFIED|NOT VERIFIED.*ListingLeadQueueSection/i.test(
      doc
    )
  );

  ok("public root pass", /\/`.*200.*PASS|`\/`.*200|Route.*\/.*200/i.test(doc));
  ok("public home pass", /\/home.*200.*PASS|home.*PASS/i.test(doc));
  ok("public marketplace pass", /\/marketplace.*PASS|marketplace.*PASS/i.test(doc));
  ok("public login pass", /\/login.*PASS|login.*PASS/i.test(doc));
  ok("api health pass", /\/api\/health.*PASS|api\/health.*200/i.test(doc));
  ok("api cars pass", /\/api\/cars.*PASS|api\/cars.*200/i.test(doc));
  ok(
    "dealer inventory guest spa shell",
    /\/dealer\/inventory.*guest|guest.*\/dealer\/inventory/i.test(doc)
  );

  ok(
    "authenticated session not available",
    /Authenticated dealer\/admin session available.*NO|session available.*NO/i.test(
      doc
    )
  );
  ok(
    "dealer portal smoke blocked",
    /BLOCKED.*no safe operator|no safe operator\/dealer session/i.test(doc)
  );
  ok(
    "sandbox crm not verified live",
    /Sandbox CRM.*NOT VERIFIED|NOT VERIFIED.*sandbox CRM/i.test(doc)
  );

  ok("api cars http 200", /GET \/api\/cars.*200|HTTP status.*200/i.test(doc));
  ok("listing count 10", /Listing count.*10|count.*\*\*10\*\*/i.test(doc));
  ok("vin absent", /`vin`.*Absent|vin.*Absent/i.test(doc));
  ok("licensePlate absent", /`licensePlate`.*Absent|licensePlate.*Absent/i.test(doc));
  ok(
    "wholesale keys absent",
    /wholesalePrice|wholesaleInternalPrice/i.test(doc)
  );
  ok("duplicate metadata absent", /duplicateStatus|duplicateMatches/i.test(doc));
  ok("imageMetadata absent", /imageMetadata.*Absent/i.test(doc));
  ok(
    "non-empty contact values zero",
    /Non-empty seller.*buyer contact|non-empty.*0/i.test(doc)
  );

  ok("cloud run not deployed", /Cloud Run.*Not deployed|Cloud Run deploy.*Not performed/i.test(doc));
  ok("cloud run not touched", /Cloud Run.*not touched|Cloud Run.*Not touched/i.test(doc));
  ok("production not touched", /Production.*Not touched|Production deploy.*NO/i.test(doc));
  ok(
    "env secrets deploy config unchanged",
    /Env.*secrets.*deploy config.*Unchanged|env.*secrets.*not changed/i.test(doc)
  );
  ok(
    "backend api route no changes",
    /Backend.*API route.*NO|backend\/API route/i.test(doc)
  );
  ok(
    "auth session routing not changed",
    /Auth.*Not changed|auth.*session.*Not changed/i.test(doc)
  );
  ok("firestore not touched", /Firestore.*Not touched|firestore.*not touched/i.test(doc));
  ok(
    "payment boost not touched",
    /Payment.*boost.*Not touched|payment.*invoice.*boost/i.test(doc)
  );
  ok(
    "ai runtime not touched",
    /AI runtime.*Not touched|Gemini.*Not touched/i.test(doc)
  );

  ok(
    "no aggregated dealer inbox gate",
    /No aggregated dealer inbox|no aggregated dealer inbox/i.test(doc)
  );
  ok(
    "parent thor group gap",
    /Parent Thor group|parent-group lead/i.test(doc)
  );
  ok(
    "authenticated smoke still blocked gate",
    /Authenticated Dealer Portal inventory smoke.*BLOCKED|still blocked/i.test(doc)
  );
  ok(
    "thor runtime import blocked",
    /Thor Auto real runtime import.*blocked|Still blocked/i.test(doc)
  );
  ok(
    "thor not unblocked in record",
    /runtime import unblocked.*NO|Do not unblock Thor Auto|remains blocked/i.test(doc)
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
  ok(
    "recommended authenticated smoke next",
    /Safe authenticated dealer|authenticated dealer\/admin staging smoke/i.test(doc)
  );
  ok(
    "package script registered",
    pkg.includes(
      "test:v67c1d-staging-hosting-deploy-dealer-portal-inventory-smoke-execution-record"
    )
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
  "\nDone v6.7C-1-D staging hosting deploy + dealer portal inventory smoke execution record tests.\n"
);
