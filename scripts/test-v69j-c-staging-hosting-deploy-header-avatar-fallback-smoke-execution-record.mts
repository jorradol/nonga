/**
 * v6.9J-C — Staging hosting deploy + header avatar fallback smoke execution record
 * (static validation only)
 * npm run test:v69j-c-staging-hosting-deploy-header-avatar-fallback-smoke-execution-record
 */
import { readFileSync } from "node:fs";

const DOC_PATH =
  "docs/v6.9J-C-staging-hosting-deploy-header-avatar-fallback-smoke-execution-record.md";
const HEAD_SHA = "339814837f516b177cb50c034a80f9f0b04d9766";
const SHORT_HASH = "3398148";
const PATCH_SHA = "e8e513333d38bb5324e42ef389b34d5ebfba23cf";
const PATCH_SHORT = "e8e5133";
const PRIOR_JS = "index-0kj8LJJl.js";
const LIVE_JS = "index-CbN1x-wa.js";
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
  "=== v6.9J-C Staging Hosting Deploy + Header Avatar Fallback Smoke Execution Record ===\n"
);

const doc = readFileSync(DOC_PATH, "utf8");
const pkg = readFileSync("package.json", "utf8");
const docLower = doc.toLowerCase();

{
  ok("doc exists", doc.length > 800);
  ok("doc v6.9J-C label", /v6\.9J-C/i.test(doc));
  ok(
    "overall PARTIAL verdict",
    /\*\*สถานะ:\*\*.*PARTIAL|Overall result.*PARTIAL/i.test(doc)
  );
  ok("head sha 3398148", doc.includes(HEAD_SHA));
  ok("short hash 3398148", doc.includes(SHORT_HASH));
  ok("patch sha e8e5133", doc.includes(PATCH_SHA));
  ok("patch short e8e5133", doc.includes(PATCH_SHORT));
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
    "v69j-b record guard pass",
    /test:v69j-b-header-avatar-fallback-patch-execution-record.*PASS/i.test(doc)
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
  ok("live bundle js reference", doc.includes("/assets/index-CbN1x-wa.js"));
  ok("live bundle css reference", doc.includes("/assets/index-v8LQYv3A.css"));

  ok(
    "background asset verification section",
    /Live asset verification|background asset check/i.test(doc)
  );
  ok("new js http 200", /index-CbN1x-wa\.js.*200|HTTP.*200.*CbN1x/i.test(doc));
  ok("css http 200", /index-v8LQYv3A\.css.*200|CSS.*200/i.test(doc));
  ok(
    "old js still http 200 not referenced",
    /index-0kj8LJJl\.js.*200|no longer referenced/i.test(doc)
  );
  ok(
    "bundle includes header avatar fallback interpretation",
    /header avatar fallback patch|ProfileAvatar/i.test(doc)
  );

  ok("cloud run not touched", /Cloud Run.*Not touched|Cloud Run not touched/i.test(doc));
  ok(
    "cloud run deploy not performed",
    /Cloud Run deploy.*Not performed|Cloud Run deploy not performed/i.test(doc)
  );
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

  ok("guest home pass", /\/home.*PASS|home.*PASS/i.test(doc));
  ok("guest profile pass", /\/profile.*PASS|guest.*profile.*PASS/i.test(doc));
  ok("no chat fallback", /no chat fallback|No chat fallback/i.test(doc));

  ok(
    "signed-in avatar not verified",
    /signed-in avatar.*NOT VERIFIED|Signed-in header.*NOT VERIFIED/i.test(doc)
  );
  ok(
    "no safe operator session",
    /no safe operator session|Safe operator session.*NO/i.test(doc)
  );
  ok(
    "authenticated profile not verified",
    /Authenticated.*profile.*NOT VERIFIED|authenticated.*profile.*not verified/i.test(doc)
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
    "not deploy-ready",
    /not deploy-ready|Not deploy-ready/i.test(doc)
  );
  ok(
    "package script registered",
    pkg.includes(
      "test:v69j-c-staging-hosting-deploy-header-avatar-fallback-smoke-execution-record"
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
  "\nDone v6.9J-C staging hosting deploy + header avatar fallback smoke execution record tests.\n"
);
