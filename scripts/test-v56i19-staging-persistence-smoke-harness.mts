/**
 * v5.6I.19 — Staging persistence smoke harness (static/offline validation only)
 * npm run test:v56i19-staging-persistence-smoke-harness
 *
 * ⚠️ NOT A LIVE SMOKE RUNNER — validates docs/checklist completeness only.
 * Does NOT fetch staging, call gcloud/firebase, or write Firestore.
 */
import { readFileSync } from "node:fs";

const DOC_PATH = "docs/v5.6I.19-staging-persistence-smoke-harness.md";
const MIN_GIT_BASELINE = "3568ca744d577514a9d40576704c648b749be17a";
const STAGING_PROJECT = "nonga-ce93c";

const SETTLEMENT_COLLECTIONS = [
  "successFeeRecords",
  "settlementAdjustments",
  "settlementAuditLogs",
  "settlementIdempotencyRecords",
] as const;

/** Smoke cases required in docs (post-enable checklist). */
const SMOKE_CASES = [
  { id: "S1", label: "/api/health", patterns: [/\/api\/health/i, /200.*health|health.*200/i] },
  {
    id: "S2",
    label: "admin revenue preview login/admin",
    patterns: [
      /\/api\/admin\/revenue\/preview/i,
      /login\/admin|admin.*login/i,
    ],
  },
  {
    id: "S3",
    label: "seller revenue preview login/seller",
    patterns: [
      /\/api\/my\/revenue\/preview/i,
      /login\/seller|seller.*login/i,
    ],
  },
  {
    id: "S4",
    label: "admin manual settlement adjustment",
    patterns: [
      /POST \/api\/admin\/revenue\/adjustments/i,
      /manual.*adjustment|settlement adjustment/i,
      /idempotency\.outcome.*processed|outcome: processed/i,
    ],
  },
  {
    id: "S5",
    label: "duplicate requestId replay no duplicate adjustment/audit",
    patterns: [
      /duplicate.*requestId|requestId.*replay/i,
      /outcome: duplicate|outcome.*duplicate/i,
      /ไม่สร้าง adjustment|audit.*ไม่เพิ่ม|audit count ไม่เพิ่ม/i,
    ],
  },
  {
    id: "S6",
    label: "conflict fingerprint 409",
    patterns: [/409/i, /conflict fingerprint|conflict.*409/i],
  },
  {
    id: "S7",
    label: "seller revenue statement own amounts only",
    patterns: [
      /seller revenue statement|revenue statement scope/i,
      /ของตัวเอง|own.*amount|ownerId/i,
    ],
  },
  {
    id: "S12",
    label: "buyer phone/PII not in settlement/admin revenue",
    patterns: [
      /PII|buyer phone|buyerPhone|buyerEmail/i,
      /ไม่มี.*buyer|ไม่ปรากฏ/i,
    ],
  },
  {
    id: "S13",
    label: "buyer lead flow",
    patterns: [/buyer lead/i],
  },
  {
    id: "S14",
    label: "seller reveal flow",
    patterns: [/seller reveal/i],
  },
  {
    id: "S15",
    label: "outcome flow",
    patterns: [/outcome flow|outcome smoke/i],
  },
  {
    id: "S16",
    label: "cancel pending sale",
    patterns: [/cancel pending sale/i],
  },
] as const;

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

function docMatchesAny(doc: string, patterns: readonly RegExp[]): boolean {
  return patterns.some((p) => p.test(doc));
}

console.log("=== v5.6I.19 Staging persistence smoke harness (static only) ===\n");
console.log(
  "⚠️  NOT A LIVE SMOKE RUNNER — offline doc/checklist validation only.\n"
);

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const selfSrc = readFileSync(
  "scripts/test-v56i19-staging-persistence-smoke-harness.mts",
  "utf8"
);
const pkg = readFileSync("package.json", "utf8");

// --- doc exists + v5.6I.19 ---
{
  ok("smoke harness doc exists", doc.length > 1200);
  ok("doc v5.6I.19 label", doc.includes("v5.6I.19"));
  ok("doc smoke harness title", /smoke harness/i.test(doc));
  ok("doc staging project", doc.includes(STAGING_PROJECT));
}

// --- NOT live smoke runner warning ---
{
  ok("doc NOT live smoke runner", /NOT A LIVE SMOKE RUNNER|not a live smoke runner/i.test(doc));
  ok("doc static offline validation", /static.*offline|offline.*validation/i.test(docLower));
  ok("script NOT live smoke runner comment", /NOT A LIVE SMOKE RUNNER/i.test(selfSrc));
  ok("doc future live runner section", /live smoke runner.*future|future.*live smoke/i.test(docLower));
}

// --- approval gate before live smoke ---
{
  ok("doc approval gate section", /approval gate/i.test(doc));
  ok("doc DO NOT RUN LIVE SMOKE YET", doc.includes("DO NOT RUN LIVE SMOKE YET"));
  ok("doc lunge approval", /ลุงอนุมัติ|finance\/admin sign-off/i.test(doc));
  ok("doc production block", /production block|ห้าม.*production/i.test(docLower));
  ok("doc baseline 3568ca7", doc.includes(MIN_GIT_BASELINE) || doc.includes("3568ca7"));
}

// --- post-enable smoke cases ---
{
  ok("doc post-enable smoke checklist", /post-enable smoke checklist/i.test(doc));
  for (const smoke of SMOKE_CASES) {
    ok(
      `smoke case ${smoke.id} ${smoke.label}`,
      docMatchesAny(doc, smoke.patterns)
    );
  }
}

// --- direct client Firestore deny 403 all 4 collections ---
{
  for (const col of SETTLEMENT_COLLECTIONS) {
    ok(`doc collection ${col}`, doc.includes(col));
    ok(`doc ${col} deny 403`, new RegExp(`${col}[\\s\\S]{0,150}403`).test(doc));
  }
  ok("doc direct client firestore deny", /direct client firestore|firestore direct client/i.test(docLower));
}

// --- rollback smoke ---
{
  ok("doc rollback smoke section", /rollback smoke/i.test(docLower));
  ok("doc rollback health", /rollback[\s\S]{0,800}\/api\/health|R1.*health/i.test(doc));
  ok("doc rollback memory off", /NONGA_SETTLEMENT_DATA_BACKEND=memory/i.test(doc));
  ok(
    "doc rollback writes false",
    /NONGA_SETTLEMENT_FIRESTORE_WRITES_ENABLED=false/i.test(doc)
  );
  ok("doc rollback when smoke fail", /ใช้เมื่อ smoke fail/i.test(doc));
  ok("doc rollback core flow", /rollback[\s\S]{0,1200}buyer lead|R6.*buyer lead/i.test(doc));
}

// --- forbidden changes ---
{
  ok("doc forbidden no deploy", /ไม่ deploy|no deploy/i.test(doc));
  ok("doc forbidden gcloud run deploy", doc.includes("gcloud run deploy"));
  ok("doc forbidden services update", doc.includes("gcloud run services update"));
  ok("doc forbidden no env flags", /ไม่เปิด env|no env flags/i.test(docLower));
  ok("doc forbidden no firestore write", /ไม่เขียน firestore|no firestore write/i.test(docLower));
  ok("doc forbidden no production", /ไม่แตะ production|no production/i.test(docLower));
  ok("doc forbidden payment invoice gemini", docLower.includes("payment") && docLower.includes("invoice"));
}

// --- test script static only (no live calls) ---
{
  ok("script no execSync gcloud", !/execSync\s*\(\s*[`'"]gcloud/.test(selfSrc));
  ok("script no spawn gcloud", !/spawn\s*\(\s*[`'"]gcloud/.test(selfSrc));
  ok("script no firebase deploy", !/execSync\s*\(\s*[`'"]firebase deploy/.test(selfSrc));
  ok("script no fetch staging", !/fetch\s*\(\s*[`'"]https:\/\/nonga-ce93c/.test(selfSrc));
  ok("script no shell gcloud invoke", !/(?:execSync|spawnSync|spawn)\s*\([^)]*gcloud/.test(selfSrc));
  ok("script no firebase app import", !/from\s+["']firebase\/app["']/.test(selfSrc));
  ok("script no firestore import", !/from\s+["']firebase\/firestore["']/.test(selfSrc));
}

// --- package.json ---
{
  ok("package v56i19 script", pkg.includes("test:v56i19-staging-persistence-smoke-harness"));
  ok(
    "package points to mts",
    pkg.includes("scripts/test-v56i19-staging-persistence-smoke-harness.mts")
  );
}

// --- cross-ref prior slices ---
{
  ok("references v56i18", doc.includes("v5.6I.18"));
  ok("references v56i17", doc.includes("v5.6I.17"));
}

console.log("\nDone v5.6I.19 staging persistence smoke harness static tests.");
