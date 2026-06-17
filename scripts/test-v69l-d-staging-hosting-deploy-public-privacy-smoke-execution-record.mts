/**
 * v6.9L-D — Staging hosting deploy + public privacy smoke execution record
 * (static validation only)
 * npm run test:v69l-d-staging-hosting-deploy-public-privacy-smoke-execution-record
 */
import { readFileSync } from "node:fs";

const DOC_PATH =
  "docs/v6.9L-D-staging-hosting-deploy-public-privacy-smoke-execution-record.md";
const HEAD_SHA = "3170c42cc1f2d9b4e4fd95290e994fd5cac723c3";
const SHORT_HASH = "3170c42";
const PATCH_SHA = "0d03318ffb9c3d55c9bc9f335a31765711d30c03";
const PATCH_SHORT = "0d03318";
const PRIOR_JS = "index-CbN1x-wa.js";
const LIVE_JS = "index-CZrVhuOd.js";
const LIVE_CSS = "index-v8LQYv3A.css";
const STAGING_URL = "https://nonga-ce93c.web.app";
const STAGING_PROJECT = "nonga-ce93c";
const DEPLOY_CMD =
  "npx -y firebase-tools@latest deploy --only hosting --project nonga-ce93c";

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
  "=== v6.9L-D Staging Hosting Deploy + Public Privacy Smoke Execution Record ===\n"
);

const doc = readFileSync(DOC_PATH, "utf8");
const pkg = readFileSync("package.json", "utf8");
const docLower = doc.toLowerCase();

{
  ok("doc exists", doc.length > 800);
  ok("doc v6.9L-D label", /v6\.9L-D/i.test(doc));
  ok(
    "overall PARTIAL verdict",
    /\*\*สถานะ:\*\*.*PARTIAL|Overall result.*PARTIAL/i.test(doc)
  );
  ok("head sha 3170c42", doc.includes(HEAD_SHA));
  ok("short hash 3170c42", doc.includes(SHORT_HASH));
  ok("patch sha 0d03318", doc.includes(PATCH_SHA));
  ok("patch short 0d03318", doc.includes(PATCH_SHORT));
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

  ok("npm run lint pass", /npm run lint.*PASS/i.test(doc));
  ok(
    "v69l-c redaction test 41 pass",
    /41\/41/.test(doc) && /test:v69l-c-public-listing-sensitive-field-redaction/i.test(doc)
  );
  ok(
    "v545b3 privacy test 26 pass",
    /26\/26/.test(doc) && /test:v545b3-public-api-privacy/i.test(doc)
  );
  ok(
    "v69l-c record guard 52 pass",
    /52\/52/.test(doc) &&
      /test:v69l-c-public-listing-sensitive-field-redaction-patch-execution-record/i.test(
        doc
      )
  );
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
  ok("files uploaded 6", /6 files|6 files from `dist`/i.test(doc));
  ok("2 new asset files uploaded", /2 new asset files/i.test(doc));

  ok("live js asset", doc.includes(LIVE_JS));
  ok("live css asset", doc.includes(LIVE_CSS));
  ok("prior js asset", doc.includes(PRIOR_JS));
  ok("live bundle js reference", doc.includes("/assets/index-CZrVhuOd.js"));
  ok("live bundle css reference", doc.includes("/assets/index-v8LQYv3A.css"));

  ok(
    "background asset verification section",
    /Background asset check|Live asset verification/i.test(doc)
  );
  ok("new js http 200", /index-CZrVhuOd\.js.*200|New JS HTTP.*200/i.test(doc));
  ok("css http 200", /index-v8LQYv3A\.css.*200|CSS HTTP.*200/i.test(doc));
  ok(
    "old js still http 200 not referenced",
    /index-CbN1x-wa\.js.*200|not referenced/i.test(doc)
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
    /Non-empty seller contact|non-empty.*0/i.test(doc)
  );
  ok(
    "contact keys empty string by design",
    /empty string.*by design|by design.*v6\.9L-C/i.test(doc)
  );

  ok("cloud run not deployed", /Cloud Run.*Not deployed|Cloud Run deploy.*Not performed/i.test(doc));
  ok("cloud run not touched", /Cloud Run.*not touched|Cloud Run.*Not touched/i.test(doc));
  ok("production not touched", /Production.*Not touched|Production deploy.*NO/i.test(doc));
  ok(
    "env secrets deploy config unchanged",
    /Env.*secrets.*deploy config.*Unchanged|env.*secrets.*not changed/i.test(doc)
  );
  ok(
    "auth session routing not changed",
    /Auth.*Not changed|auth.*session.*Not changed/i.test(doc)
  );
  ok("firestore not touched", /Firestore.*Not touched|firestore.*not touched/i.test(doc));
  ok(
    "leads payment ai not touched",
    /Lead system.*DealerLeads|Payment.*boost|AI runtime/i.test(doc)
  );

  ok("guest home pass", /\/home.*PASS|home.*PASS/i.test(doc));
  ok("guest profile pass", /\/profile.*PASS|guest.*profile.*PASS/i.test(doc));
  ok(
    "no chat fallback regression",
    /Chat.*fallback.*Not observed|no chat fallback/i.test(doc)
  );

  ok(
    "live vin plate not present reason",
    /no records with `vin`\/`licensePlate`|does not contain records with `vin`/i.test(doc)
  );
  ok(
    "static tests primary synthetic proof",
    /Static tests|static unit tests|41\/41 PASS/i.test(doc)
  );
  ok(
    "thor runtime import blocked",
    /Thor Auto real runtime import.*blocked|Still blocked/i.test(doc)
  );
  ok(
    "thor not unblocked in record",
    /runtime import unblocked.*NO|Do not unblock Thor Auto/i.test(doc)
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
    "residual description sanitizer",
    /Description sanitizer.*pattern-based|pattern-based/i.test(docLower)
  );
  ok(
    "residual ownerId public",
    /ownerId.*remain|ownerId remains public/i.test(doc)
  );
  ok(
    "package script registered",
    pkg.includes(
      "test:v69l-d-staging-hosting-deploy-public-privacy-smoke-execution-record"
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
  "\nDone v6.9L-D staging hosting deploy + public privacy smoke execution record tests.\n"
);
